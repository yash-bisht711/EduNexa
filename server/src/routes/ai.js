import {Router} from 'express';
import rateLimit from 'express-rate-limit';
import {auth} from '../middleware/auth.js';
import {AIConversation,Enrollment,Course} from '../models/index.js';

const router=Router();
const MAX_MESSAGES=12;
const SYSTEM_PROMPT=`You are Nexa, the supportive AI learning coach inside EduNexa. Teach accurately and patiently. Adapt to the learner's level. Prefer clear explanations, practical examples, short steps and a quick check-for-understanding. If asked about an answer to an active graded assessment, explain the underlying concept rather than impersonating the student or claiming to submit work. Never claim to have accessed private course content unless it is provided in the conversation. If uncertain, say so. Keep responses structured and useful.`;

async function generateWithGemini(messages,context){
  const key=process.env.GEMINI_API_KEY;
  if(!key) return null;
  const contents=[{role:'user',parts:[{text:`${SYSTEM_PROMPT}\n\nLearning context: ${context||'General learning'}`}]} , ...messages.map(m=>({role:m.role==='assistant'?'model':'user',parts:[{text:m.content}]}))];
  const model=process.env.GEMINI_MODEL||'gemini-2.5-flash';
  const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents,generationConfig:{temperature:0.45,maxOutputTokens:1200}})});
  const data=await response.json();
  if(!response.ok) throw new Error(data.error?.message||'Gemini request failed');
  return data.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('\n').trim()||'I could not generate a response. Please try again.';
}
async function generateWithOpenAI(messages,context){
  const key=process.env.OPENAI_API_KEY;
  if(!key) return null;
  const response=await fetch(process.env.OPENAI_BASE_URL||'https://api.openai.com/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-4o-mini',messages:[{role:'system',content:`${SYSTEM_PROMPT}\n\nLearning context: ${context||'General learning'}`},...messages],temperature:0.45,max_tokens:1200})});
  const data=await response.json();
  if(!response.ok) throw new Error(data.error?.message||'AI provider request failed');
  return data.choices?.[0]?.message?.content?.trim()||'I could not generate a response. Please try again.';
}
async function generateReply(messages,context){
  const reply=await generateWithGemini(messages,context)||await generateWithOpenAI(messages,context);
  if(!reply) {const e=new Error('AI is not configured. Add GEMINI_API_KEY or OPENAI_API_KEY to server/.env and restart the API.');e.status=503;throw e;}
  return reply;
}

router.use(auth);
router.use(rateLimit({windowMs:15*60*1000,limit:30,standardHeaders:true,legacyHeaders:false,keyGenerator:req=>String(req.user._id),message:{message:'AI usage limit reached. Please try again later.'}}));
router.get('/conversations',async(req,res,next)=>{try{const conversations=await AIConversation.find({user:req.user._id}).sort({updatedAt:-1}).limit(30).select('title context.courseTitle updatedAt messages');res.json({conversations:conversations.map(c=>({_id:c._id,title:c.title,courseTitle:c.context?.courseTitle,updatedAt:c.updatedAt,messageCount:c.messages.length}))});}catch(e){next(e);}});
router.get('/conversations/:id',async(req,res,next)=>{try{const conversation=await AIConversation.findOne({_id:req.params.id,user:req.user._id});if(!conversation)return res.status(404).json({message:'Conversation not found'});res.json({conversation});}catch(e){next(e);}});
router.post('/chat',async(req,res,next)=>{try{
  const content=String(req.body.message||'').trim();
  if(!content||content.length>4000)return res.status(400).json({message:'Message must be between 1 and 4000 characters.'});
  let conversation=req.body.conversationId?await AIConversation.findOne({_id:req.body.conversationId,user:req.user._id}):null;
  if(req.body.conversationId&&!conversation)return res.status(404).json({message:'Conversation not found'});
  const contextCourse=req.body.courseId?await Course.findById(req.body.courseId).select('title'):null;
  if(!conversation) conversation=await AIConversation.create({user:req.user._id,title:content.slice(0,64),context:{courseId:contextCourse?._id,courseTitle:contextCourse?.title},messages:[]});
  const recent=conversation.messages.slice(-MAX_MESSAGES).map(m=>({role:m.role,content:m.content}));
  const pending=[...recent,{role:'user',content}];
  const answer=await generateReply(pending,conversation.context?.courseTitle);
  conversation.messages.push({role:'user',content},{role:'assistant',content:answer});
  if(conversation.messages.length>40)conversation.messages=conversation.messages.slice(-40);
  await conversation.save();
  res.json({conversationId:conversation._id,answer,createdAt:new Date().toISOString()});
}catch(e){next(e);}});
router.delete('/conversations/:id',async(req,res,next)=>{try{const result=await AIConversation.deleteOne({_id:req.params.id,user:req.user._id});if(!result.deletedCount)return res.status(404).json({message:'Conversation not found'});res.json({message:'Conversation deleted'});}catch(e){next(e);}});
router.get('/study-plan',async(req,res,next)=>{try{
  const enrollments=await Enrollment.find({student:req.user._id}).populate('course','title category level lessons').lean();
  const learning= enrollments.map(e=>({course:e.course?.title,category:e.course?.category,level:e.course?.level,progress:e.progress||0,completedLessons:e.completedLessons?.length||0,totalLessons:e.course?.lessons?.length||0})).filter(x=>x.course);
  const prompt=`Create a practical 7-day study plan for this learner. Return concise JSON with keys: goal (string), dailyMinutes (number), days (array of 7 objects with day, focus, tasks (array of 2-3 strings), estimatedMinutes), tips (array of 3 strings). Use their current learning progress and avoid assuming skills not supplied. Learner: ${req.user.name}. Enrollments: ${JSON.stringify(learning)}. If there are no enrollments, create a beginner-friendly plan to choose and start a first course.`;
  const answer=await generateReply([{role:'user',content:prompt}],'Personalized study planning');
  let plan;try{const cleaned=answer.replace(/^```(?:json)?\s*/i,'').replace(/```\s*$/,'');plan=JSON.parse(cleaned);}catch{plan={goal:'Build a consistent learning habit',dailyMinutes:30,days:[{day:'Day 1',focus:'Choose a learning goal',tasks:['Choose one course','Set a 30-minute study block'],estimatedMinutes:30}],tips:[answer]};}
  res.json({plan,generatedAt:new Date().toISOString()});
}catch(e){next(e);}});
export default router;
