import PDFDocument from 'pdfkit';import {Enrollment} from '../models/index.js';
export function makeCertificate({student,course,instructorName='EduNexa Academy'}){return new Promise((resolve,reject)=>{const doc=new PDFDocument({size:'A4',layout:'landscape',margin:50});const chunks=[];doc.on('data',c=>chunks.push(c));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);
// Outer border
doc.rect(18,18,806,559).lineWidth(4).stroke('#6d5dfc');
doc.rect(26,26,790,543).lineWidth(1).stroke('#a89cf7');
// Decorative star/diamond pattern top
const starY=48;const starPoints=[80,200,340,460,570,680,760];for(const x of starPoints){doc.save().translate(x,starY).rotate(45).rect(-6,-6,12,12).fillAndStroke('#6d5dfc','#6d5dfc').restore();}
// Decorative lines
doc.moveTo(50,70).lineTo(780,70).lineWidth(1).stroke('#c4b8ff');doc.moveTo(50,73).lineTo(780,73).lineWidth(0.5).stroke('#c4b8ff');
doc.fontSize(18).fillColor('#6d5dfc').text('EDUNEXA ACADEMY',{align:'center'});
doc.moveDown(1.5);
doc.fontSize(34).fillColor('#172033').text('CERTIFICATE OF COMPLETION',{align:'center'});
doc.moveDown();
doc.fontSize(16).fillColor('#555').text('This is proudly presented to',{align:'center'});
doc.moveDown(.6);
doc.fontSize(30).fillColor('#242044').text(student.name,{align:'center'});
doc.moveDown(.8);
doc.fontSize(16).fillColor('#555').text('for successfully completing the course',{align:'center'});
doc.moveDown(.5);
doc.fontSize(24).fillColor('#6d5dfc').text(course.title,{align:'center'});
doc.moveDown(1.5);
doc.fontSize(13).fillColor('#444').text(`Certified by ${instructorName}`,{align:'center'});
doc.moveDown(.6);
doc.fontSize(12).fillColor('#666').text(`Issued on ${new Date().toLocaleDateString('en-IN')}`,{align:'center'});
doc.moveDown(.8);
const verifyUrl=`https://edunexa.dev/verify/${course._id||course.id}-${student._id||student.id}`;doc.fontSize(10).fillColor('#888').text(`Verify at: ${verifyUrl}`,{align:'center'});
// Bottom decorative line
doc.moveTo(50,520).lineTo(780,520).lineWidth(1).stroke('#c4b8ff');doc.moveTo(50,523).lineTo(780,523).lineWidth(0.5).stroke('#c4b8ff');
// Bottom stars
const bStarY=540;for(const x of starPoints){doc.save().translate(x,bStarY).rotate(45).rect(-5,-5,10,10).fillAndStroke('#a89cf7','#a89cf7').restore();}
doc.end();});}
export async function verifyCertificate({courseId,studentId}){try{const enrollment=await Enrollment.findOne({course:courseId,student:studentId});return{verified:!!enrollment,enrolled:!!enrollment,completedAt:enrollment?.completedAt||null};}catch{return{verified:false,enrolled:false,completedAt:null};}}
