import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
const rubricSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  workspaceId: { type: String, required: true, ref: 'Workspace' },
  name: { type: String, required: true },
  criteria: { type: [Object], default: [] },
  deletedAt: { type: Date }
},{ timestamps:true, toJSON:{ transform(doc,ret){ ret.id=ret._id; delete ret._id; delete ret.__v;} } });

rubricSchema.pre(/^find/, function(next){ this.where({ deletedAt: null }); next(); });

const Rubric = mongoose.model('Rubric', rubricSchema);
export default Rubric;
