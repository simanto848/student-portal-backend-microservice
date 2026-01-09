import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const examCommitteeSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: uuidv4,
    },
    departmentId: {
      type: String,
      required: true,
      ref: "Department",
    },
    teacherId: {
      type: String,
      required: true,
      ref: "Teacher",
    },
    shift: {
      type: String,
      enum: ["day", "evening"],
      required: true,
      default: "day",
    },
    status: {
      type: Boolean,
      default: true,
    },
    batchId: {
      type: String,
      ref: "Batch",
      default: null,
    },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

examCommitteeSchema.index(
  { departmentId: 1, teacherId: 1, shift: 1, batchId: 1 },
  { unique: true }
);

examCommitteeSchema.pre(/^find/, function (next) {
  if (this.getOptions().includeDeleted !== true) {
    this.where({ deletedAt: null });
  }
  if (next) next();
});

const ExamCommittee = mongoose.model("ExamCommittee", examCommitteeSchema);
export default ExamCommittee;
