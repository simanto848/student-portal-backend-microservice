import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const topicSchema = new mongoose.Schema({
  _id: {
      type: String,
      default: uuidv4
  },
  workspaceId: {
      type: String,
      required: true,
      ref: 'Workspace'
  },
  title: {
      type: String,
      required: true
  },
  order: {
      type: Number,
      default: 0
  },
  deletedAt: {
      type: Date
  }
}, {
    timestamps: true,
    toJSON: {
        transform(doc, ret){
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
        }
    }
});

topicSchema.index({ workspaceId: 1, order: 1 });

topicSchema.pre(/^find/, function(next){
    this.where({ deletedAt: null });
    next();
});

const Topic = mongoose.model('Topic', topicSchema);
export default Topic;
