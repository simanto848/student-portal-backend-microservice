import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const quizSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: uuidv4
    },
    workspaceId: {
        type: String,
        required: true,
        ref: 'Workspace',
        index: true
    },
    topicId: {
        type: String,
        ref: 'Topic'
    },
    title: {
        type: String,
        required: [true, 'Quiz title is required'],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    instructions: {
        type: String,
        trim: true
    },
    duration: {
        type: Number,
        required: [true, 'Quiz duration is required'],
        min: [1, 'Duration must be at least 1 minute']
    },
    maxAttempts: {
        type: Number,
        default: 1,
        min: 1
    },
    maxScore: {
        type: Number,
        default: 100
    },
    passingScore: {
        type: Number,
        default: 0
    },
    startAt: {
        type: Date
    },
    endAt: {
        type: Date
    },
    shuffleQuestions: {
        type: Boolean,
        default: false
    },
    shuffleOptions: {
        type: Boolean,
        default: false
    },
    showResultsAfterSubmit: {
        type: Boolean,
        default: true
    },
    showCorrectAnswers: {
        type: Boolean,
        default: false
    },
    allowReviewAfterSubmit: {
        type: Boolean,
        default: true
    },
    status: {
        type: String,
        enum: ['draft', 'published', 'closed'],
        default: 'draft'
    },
    publishedAt: {
        type: Date
    },
    createdById: {
        type: String,
        required: true
    },
    questionCount: {
        type: Number,
        default: 0
    },
    deletedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true,
    toJSON: {
        transform(doc, ret) {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
        }
    }
});

quizSchema.index({ workspaceId: 1, status: 1 });
quizSchema.index({ startAt: 1, endAt: 1 });
quizSchema.index({ createdById: 1 });

quizSchema.pre(/^find/, function (next) {
    this.where({ deletedAt: null });
    if (next) next();
});

quizSchema.pre('countDocuments', function (next) {
    this.where({ deletedAt: null });
    if (next) next();
});

quizSchema.methods.softDelete = function () {
    this.deletedAt = new Date();
    return this.save();
};

quizSchema.methods.isAvailable = function () {
    const now = new Date();
    if (this.status !== 'published') return false;
    if (this.startAt && now < this.startAt) return false;
    if (this.endAt && now > this.endAt) return false;
    return true;
};

const Quiz = mongoose.model('Quiz', quizSchema);
export default Quiz;
