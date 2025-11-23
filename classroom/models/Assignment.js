import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
const assignmentSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: uuidv4
  },
  workspaceId: {
    type: String,
    required: true,
    ref: 'Workspace'
  },
  topicId: {
    type: String,
    ref: 'Topic'
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  attachments: {
    type: [Object],
    default: []
  },
  dueAt: {
    type: Date
  },
  allowLate: {
    type: Boolean,
    default: true
  },
  maxScore: {
    type: Number,
    default: 100
  },
  rubricId: {
    type: String,
    ref: 'Rubric'
  },
  status: {
    type: String,
    enum: ['draft','published','closed'],
    default: 'draft'
  },
  publishedAt: {
    type: Date
  },
  createdById: {
    type: String
  },
  deletedAt: {
    type: Date },
  reminder24hSentAt: {
    type: Date
  },
  reminder1hSentAt: {
    type: Date
  }
},{
  timestamps:true,
  toJSON:{
    transform(doc,ret) {
      ret.id=ret._id;
      delete ret._id;
      delete ret.__v;
    }
  }
});

assignmentSchema.index({ workspaceId:1, dueAt:1 });
assignmentSchema.pre(/^find/, function(next){ this.where({ deletedAt: null }); if(next) next(); });

const Assignment = mongoose.model('Assignment', assignmentSchema);
export default Assignment;
