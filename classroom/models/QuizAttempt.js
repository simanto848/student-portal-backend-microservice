import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const answerSchema = new mongoose.Schema({
    questionId: {
        type: String,
        required: true
    },
    selectedOptions: {
        type: [String],
        default: []
    },
    writtenAnswer: {
        type: String,
        trim: true
    },
    isCorrect: {
        type: Boolean,
        default: null
    },
    pointsAwarded: {
        type: Number,
        default: null
    },
    feedback: {
        type: String,
        trim: true
    }
}, { _id: false });

const quizAttemptSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: uuidv4
    },
    quizId: {
        type: String,
        required: true,
        ref: 'Quiz',
        index: true
    },
    studentId: {
        type: String,
        required: true,
        index: true
    },
    attemptNumber: {
        type: Number,
        required: true,
        default: 1
    },
    startedAt: {
        type: Date,
        required: true,
        default: Date.now
    },
    submittedAt: {
        type: Date
    },
    expiresAt: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['in_progress', 'submitted', 'graded', 'timed_out'],
        default: 'in_progress'
    },
    isAutoSubmitted: {
        type: Boolean,
        default: false
    },
    isLate: {
        type: Boolean,
        default: false
    },
    score: {
        type: Number,
        default: null
    },
    maxScore: {
        type: Number,
        required: true
    },
    percentage: {
        type: Number,
        default: null
    },
    isPassed: {
        type: Boolean,
        default: null
    },
    answers: {
        type: [answerSchema],
        default: []
    },
    questionsOrder: {
        type: [String],
        default: []
    },
    gradedById: {
        type: String
    },
    manualScore: {
        type: Number,
        default: null
    },
    graderFeedback: {
        type: String,
        trim: true
    },
    gradedAt: {
        type: Date
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

quizAttemptSchema.index({ quizId: 1, studentId: 1 });
quizAttemptSchema.index({ status: 1, expiresAt: 1 });
quizAttemptSchema.index({ studentId: 1, status: 1 });

// Calculate time remaining
quizAttemptSchema.methods.getTimeRemaining = function () {
    if (this.status !== 'in_progress') return 0;
    const now = new Date();
    const remaining = this.expiresAt.getTime() - now.getTime();
    return Math.max(0, Math.floor(remaining / 1000)); // seconds
};

// Check if attempt has expired
quizAttemptSchema.methods.hasExpired = function () {
    return new Date() >= this.expiresAt;
};

// Calculate score
quizAttemptSchema.methods.calculateScore = function () {
    let totalAwarded = 0;
    let allGraded = true;

    for (const answer of this.answers) {
        if (answer.pointsAwarded !== null) {
            totalAwarded += answer.pointsAwarded;
        } else {
            allGraded = false;
        }
    }

    // If manual score is set, use it. Otherwise sum points.
    if (this.manualScore !== null && this.manualScore !== undefined) {
        this.score = this.manualScore;
    } else {
        this.score = totalAwarded;
    }

    this.percentage = this.maxScore > 0 ? Math.round((this.score / this.maxScore) * 100) : 0;

    if (allGraded) {
        this.status = 'graded';
    }

    return { score: this.score, percentage: this.percentage, allGraded };
};

const QuizAttempt = mongoose.model('QuizAttempt', quizAttemptSchema);
export default QuizAttempt;
