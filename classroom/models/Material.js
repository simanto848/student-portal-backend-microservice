import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
const materialSchema = new mongoose.Schema({
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
  type: {
    type: String,
    enum: ['file','link','text'],
    required: true
  },
  content: {
    type: String
  },
  attachments: {
    type: [Object],
    default: []
  },
  publishedAt: {
    type: Date,
    default: null
  },
  visibility: {
    type: String,
    enum: ['all','teachers'],
    default: 'all'
  },
  createdById: {
    type: String

  },
  deletedAt: {
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

materialSchema.index({ workspaceId:1, publishedAt: -1 });
materialSchema.pre(/^find/, function(next){ this.where({ deletedAt: null }); if(next) next(); });

const Material = mongoose.model('Material', materialSchema);
export default Material;
