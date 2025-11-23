import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
const streamItemSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  workspaceId: { type: String, required: true, ref: 'Workspace' },
  type: { type: String, enum: ['assignment','material','announcement','grade_event','feedback'], required: true },
  refId: { type: String },
  actorId: { type: String },
  createdAt: { type: Date, default: Date.now }
},{ timestamps:false, toJSON:{ transform(doc,ret){ ret.id=ret._id; delete ret._id; delete ret.__v;} } });

streamItemSchema.index({ workspaceId:1, createdAt:-1 });

const StreamItem = mongoose.model('StreamItem', streamItemSchema);
export default StreamItem;
