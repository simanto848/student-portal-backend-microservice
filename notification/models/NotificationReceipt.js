import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const receiptSchema = new mongoose.Schema({
  _id: {
      type: String,
      default: uuidv4
  },
  notificationId: {
      type: String,
      required: true,
      index: true,
      ref: 'Notification'
  },
  userId: {
      type: String,
      required: true,
      index: true
  },
  userRole: {
      type: String,
      required: true,
      index: true
  },
  readAt: {
      type: Date
  },
  acknowledgedAt: {
      type: Date
  },
  reaction: {
      type: String,
      enum: ['like', 'helpful', 'important', 'noted']
  },
  deviceInfo: {
      type: mongoose.Schema.Types.Mixed
  },
  ipAddress: {
      type: String
  },
  deletedAt: {
      type: Date,
      default: null
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

receiptSchema.index({ notificationId: 1, userId: 1 }, { unique: true });
receiptSchema.index({ deletedAt: 1 });

receiptSchema.pre(/^find/, function(next){
    this.where({ deletedAt: null }); next();
});

const NotificationReceipt = mongoose.model('NotificationReceipt', receiptSchema);
export default NotificationReceipt;
