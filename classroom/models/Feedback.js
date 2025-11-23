import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
const feedbackSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: uuidv4
  },
  submissionId: {
    type: String,
    required: true,
    ref: 'Submission'
  },
  authorId: {
    type: String,
    required: true

  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['comment','inline','score_change'],
    default: 'comment'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  deletedAt: {
    type: Date

  }
},{
  timestamps:false,
  toJSON:{
    transform(doc,ret){
      ret.id=ret._id;
      delete ret._id;
      delete ret.__v;
    }
  }
});

feedbackSchema.pre(/^find/, function(next){ this.where({ deletedAt: null }); if(next) next(); });

const Feedback = mongoose.model('Feedback', feedbackSchema);
export default Feedback;
