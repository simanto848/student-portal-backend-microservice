import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
const submissionSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: uuidv4
  },
  assignmentId: {
    type: String,
    required: true,
    ref: 'Assignment'
  },
  workspaceId: {
    type: String,
    required: true,
    ref: 'Workspace'
  },
  studentId: {
    type: String,
    required: true
  },
  submittedAt: {
    type: Date },
  files: {
    type: [Object],
    default: []
  },
  textAnswer: {
    type: String },
  status: {
    type: String,
    enum: ['none','draft','submitted','resubmitted','graded'],
    default: 'none'
  },
  grade: {
    type: Number,
    default: null
  },
  rubricScores: {
    type: [Object],
    default: []
  },
  feedbackCount: {
    type: Number,
    default: 0
  },
  late: {
    type: Boolean,
    default: false
  },
  gradedAt: {
    type: Date
  },
  gradedById: {
    type: String
  },
  deletedAt: {
    type: Date
  }
},{ timestamps:true, toJSON:{ transform(doc,ret){ ret.id=ret._id; delete ret._id; delete ret.__v;} } });

submissionSchema.index({ assignmentId:1, studentId:1 }, { unique: true });
submissionSchema.pre(/^find/, function(next){
  this.where({ deletedAt: null });
  if(next)next();
});

const Submission = mongoose.model('Submission', submissionSchema);
export default Submission;
