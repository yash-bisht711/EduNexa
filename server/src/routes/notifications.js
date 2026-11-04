import {Router} from 'express';import {Notification} from '../models/index.js';import {auth} from '../middleware/auth.js';
const r=Router();
r.get('/',auth,async(req,res,next)=>{try{const notifications=await Notification.find({user:req.user._id}).sort({read:1,createdAt:-1}).limit(20);res.json({notifications});}catch(e){next(e);}});
r.patch('/read-all',auth,async(req,res,next)=>{try{await Notification.updateMany({user:req.user._id,read:false},{read:true});res.json({message:'All notifications marked as read'});}catch(e){next(e);}});
r.patch('/:id/read',auth,async(req,res,next)=>{try{const n=await Notification.findOne({_id:req.params.id,user:req.user._id});if(!n)return res.status(404).json({message:'Notification not found'});n.read=true;await n.save();res.json({notification:n});}catch(e){next(e);}});
r.delete('/:id',auth,async(req,res,next)=>{try{const n=await Notification.findOneAndDelete({_id:req.params.id,user:req.user._id});if(!n)return res.status(404).json({message:'Notification not found'});res.json({message:'Notification deleted'});}catch(e){next(e);}});
export default r;
