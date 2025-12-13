import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const batchSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: uuidv4,
    },
    name: {
      type: String,
      required: true,
      maxlength: 50,
      validate: {
        validator: (v) => /^\d+$/.test(String(v || "")),
        message: "Batch name must contain only numbers",
      },
    },
    shift: {
      type: String,
      required: true,
      enum: ["day", "evening"],
    },
    year: {
      type: Number,
      required: true,
    },
    programId: {
      type: String,
      ref: "Program",
      required: true,
    },
    departmentId: {
      type: String,
      ref: "Department",
      required: true,
    },
    sessionId: {
      type: String,
      ref: "Session",
      required: true,
    },
    counselorId: {
      type: String,
      ref: "Teacher",
    },
    classRepresentativeId: {
      type: String,
      ref: "Student",
    },
    currentSemester: {
      type: Number,
      default: 1,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    maxStudents: {
      type: Number,
      required: true,
      default: 50,
    },
    currentStudents: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: Boolean,
      default: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        const prefix = ret.shift === "evening" ? "E" : "D";
        ret.code = `${prefix}-${ret.name}`;
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

batchSchema.index({ deletedAt: 1 });
batchSchema.index({ year: 1 });
batchSchema.index({ programId: 1 });
batchSchema.index({ departmentId: 1 });
batchSchema.index({ counselorId: 1 });
batchSchema.index({ status: 1 });
batchSchema.index({ sessionId: 1 });
batchSchema.index(
  { name: 1, shift: 1, programId: 1, departmentId: 1, sessionId: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } }
);

batchSchema.pre(/^find/, function (next) {
  this.where({ deletedAt: null });
  if (next) next();
});

batchSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  return this.save();
};

batchSchema.methods.restore = function () {
  this.deletedAt = null;
  return this.save();
};

const Batch = mongoose.model("Batch", batchSchema);

export default Batch;
