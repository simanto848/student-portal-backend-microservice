import SupportTicket from '../models/SupportTicket.js';
import Admin from '../models/Admin.js';
import { ApiError } from 'shared';

class SupportTicketService {
    async getAll(options = {}) {
        try {
            const { pagination, search, filters = {}, userRole, userId } = options;
            const query = {};

            // Status filter
            if (filters.status) {
                query.status = filters.status;
            }

            // Priority filter
            if (filters.priority) {
                query.priority = filters.priority;
            }

            // Category filter
            if (filters.category) {
                query.category = filters.category;
            }

            // Assigned to filter (for moderators viewing their tickets)
            if (filters.assignedTo) {
                query.assignedTo = filters.assignedTo;
            }

            // If moderator, only show assigned tickets or unassigned
            if (userRole === 'moderator' && !filters.showAll) {
                query.$or = [
                    { assignedTo: userId },
                    { assignedTo: null },
                ];
            }

            // Search
            if (search) {
                query.$or = [
                    { subject: { $regex: search, $options: 'i' } },
                    { ticketNumber: { $regex: search, $options: 'i' } },
                    { createdByName: { $regex: search, $options: 'i' } },
                    { createdByEmail: { $regex: search, $options: 'i' } },
                ];
            }

            // Pagination
            if (pagination && (pagination.page || pagination.limit)) {
                const page = parseInt(pagination.page) || 1;
                const limit = parseInt(pagination.limit) || 10;
                const skip = (page - 1) * limit;

                const [tickets, total] = await Promise.all([
                    SupportTicket.find(query)
                        .populate('assignedTo', 'fullName email role')
                        .sort({ priority: -1, createdAt: -1 })
                        .skip(skip)
                        .limit(limit)
                        .lean(),
                    SupportTicket.countDocuments(query),
                ]);

                return {
                    tickets,
                    pagination: {
                        page,
                        limit,
                        total,
                        pages: Math.ceil(total / limit),
                    },
                };
            }

            const tickets = await SupportTicket.find(query)
                .populate('assignedTo', 'fullName email role')
                .sort({ priority: -1, createdAt: -1 })
                .lean();

            return { tickets };
        } catch (error) {
            throw new ApiError(500, 'Error fetching tickets: ' + error.message);
        }
    }

    async getById(ticketId, options = {}) {
        try {
            const ticket = await SupportTicket.findById(ticketId)
                .populate('assignedTo', 'fullName email role')
                .lean();

            if (!ticket) {
                throw new ApiError(404, 'Ticket not found');
            }

            if (options.userRole === 'moderator' && options.userId) {
                if (ticket.assignedTo && ticket.assignedTo._id !== options.userId && ticket.createdBy !== options.userId) {
                    throw new ApiError(403, 'You do not have access to this ticket');
                }
            }

            return ticket;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error fetching ticket: ' + error.message);
        }
    }

    async create(ticketData) {
        try {
            const ticket = await SupportTicket.create({
                ...ticketData,
                messages: [{
                    sender: ticketData.createdBy,
                    senderType: 'user',
                    senderName: ticketData.createdByName,
                    content: ticketData.description,
                }],
            });

            return await SupportTicket.findById(ticket._id)
                .populate('assignedTo', 'fullName email role')
                .lean();
        } catch (error) {
            throw new ApiError(500, 'Error creating ticket: ' + error.message);
        }
    }

    async update(ticketId, updateData, updatedBy) {
        try {
            // Prevent updating certain fields
            delete updateData.ticketNumber;
            delete updateData.createdBy;
            delete updateData.createdByType;
            delete updateData.messages;

            const ticket = await SupportTicket.findByIdAndUpdate(
                ticketId,
                { $set: updateData },
                { new: true, runValidators: true }
            ).populate('assignedTo', 'fullName email role');

            if (!ticket) {
                throw new ApiError(404, 'Ticket not found');
            }

            return ticket;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error updating ticket: ' + error.message);
        }
    }

    async assign(ticketId, assigneeId, assignedByName) {
        try {
            const assignee = await Admin.findById(assigneeId);
            if (!assignee) {
                throw new ApiError(404, 'Assignee not found');
            }

            const ticket = await SupportTicket.findByIdAndUpdate(
                ticketId,
                {
                    $set: {
                        assignedTo: assigneeId,
                        assignedToName: assignee.fullName,
                        status: 'in_progress',
                    },
                    $push: {
                        internalNotes: {
                            note: `Ticket assigned to ${assignee.fullName}`,
                            addedBy: assignedByName,
                            addedByName: assignedByName,
                        },
                    },
                },
                { new: true }
            ).populate('assignedTo', 'fullName email role');

            if (!ticket) {
                throw new ApiError(404, 'Ticket not found');
            }

            return ticket;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error assigning ticket: ' + error.message);
        }
    }

    async addMessage(ticketId, messageData) {
        try {
            const ticket = await SupportTicket.findByIdAndUpdate(
                ticketId,
                {
                    $push: { messages: messageData },
                    $set: {
                        status: messageData.senderType === 'user' ? 'open' : 'pending_user',
                    },
                },
                { new: true }
            ).populate('assignedTo', 'fullName email role');

            if (!ticket) {
                throw new ApiError(404, 'Ticket not found');
            }

            return ticket;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error adding message: ' + error.message);
        }
    }

    async addInternalNote(ticketId, noteData) {
        try {
            const ticket = await SupportTicket.findByIdAndUpdate(
                ticketId,
                { $push: { internalNotes: noteData } },
                { new: true }
            ).populate('assignedTo', 'fullName email role');

            if (!ticket) {
                throw new ApiError(404, 'Ticket not found');
            }

            return ticket;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error adding note: ' + error.message);
        }
    }

    async resolve(ticketId, resolvedBy, resolvedByName) {
        try {
            const ticket = await SupportTicket.findByIdAndUpdate(
                ticketId,
                {
                    $set: {
                        status: 'resolved',
                        resolvedAt: new Date(),
                        resolvedBy: resolvedBy,
                    },
                    $push: {
                        messages: {
                            sender: resolvedBy,
                            senderType: 'system',
                            senderName: 'System',
                            content: `Ticket resolved by ${resolvedByName}`,
                        },
                    },
                },
                { new: true }
            ).populate('assignedTo', 'fullName email role');

            if (!ticket) {
                throw new ApiError(404, 'Ticket not found');
            }

            return ticket;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error resolving ticket: ' + error.message);
        }
    }

    async close(ticketId, closedBy, closedByName) {
        try {
            const ticket = await SupportTicket.findByIdAndUpdate(
                ticketId,
                {
                    $set: {
                        status: 'closed',
                        closedAt: new Date(),
                        closedBy: closedBy,
                    },
                    $push: {
                        messages: {
                            sender: closedBy,
                            senderType: 'system',
                            senderName: 'System',
                            content: `Ticket closed by ${closedByName}`,
                        },
                    },
                },
                { new: true }
            ).populate('assignedTo', 'fullName email role');

            if (!ticket) {
                throw new ApiError(404, 'Ticket not found');
            }

            return ticket;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error closing ticket: ' + error.message);
        }
    }

    async reopen(ticketId, reopenedBy, reopenedByName) {
        try {
            const ticket = await SupportTicket.findByIdAndUpdate(
                ticketId,
                {
                    $set: {
                        status: 'open',
                        resolvedAt: null,
                        closedAt: null,
                    },
                    $push: {
                        messages: {
                            sender: reopenedBy,
                            senderType: 'system',
                            senderName: 'System',
                            content: `Ticket reopened by ${reopenedByName}`,
                        },
                    },
                },
                { new: true }
            ).populate('assignedTo', 'fullName email role');

            if (!ticket) {
                throw new ApiError(404, 'Ticket not found');
            }

            return ticket;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error reopening ticket: ' + error.message);
        }
    }

    async rate(ticketId, rating) {
        try {
            const ticket = await SupportTicket.findById(ticketId);

            if (!ticket) {
                throw new ApiError(404, 'Ticket not found');
            }

            if (ticket.status !== 'resolved' && ticket.status !== 'closed') {
                throw new ApiError(400, 'Can only rate resolved or closed tickets');
            }

            ticket.rating = {
                score: rating.score,
                feedback: rating.feedback,
                ratedAt: new Date(),
            };

            await ticket.save();
            return ticket;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error rating ticket: ' + error.message);
        }
    }

    async getStatistics(options = {}) {
        try {
            const { userId, userRole } = options;
            const baseQuery = {};
            if (userRole === 'moderator' && userId) {
                baseQuery.assignedTo = userId;
            }

            const [
                total,
                open,
                inProgress,
                pendingUser,
                resolved,
                closed,
                urgentOpen,
                unassigned,
            ] = await Promise.all([
                SupportTicket.countDocuments(baseQuery),
                SupportTicket.countDocuments({ ...baseQuery, status: 'open' }),
                SupportTicket.countDocuments({ ...baseQuery, status: 'in_progress' }),
                SupportTicket.countDocuments({ ...baseQuery, status: 'pending_user' }),
                SupportTicket.countDocuments({ ...baseQuery, status: 'resolved' }),
                SupportTicket.countDocuments({ ...baseQuery, status: 'closed' }),
                SupportTicket.countDocuments({ ...baseQuery, status: 'open', priority: 'urgent' }),
                SupportTicket.countDocuments({ ...baseQuery, assignedTo: null, status: { $in: ['open', 'in_progress'] } }),
            ]);

            return {
                total,
                byStatus: {
                    open,
                    in_progress: inProgress,
                    pending_user: pendingUser,
                    resolved,
                    closed,
                },
                urgentOpen,
                unassigned,
            };
        } catch (error) {
            throw new ApiError(500, 'Error fetching statistics: ' + error.message);
        }
    }

    async getByUser(userId) {
        try {
            const tickets = await SupportTicket.find({ createdBy: userId })
                .populate('assignedTo', 'fullName email role')
                .sort({ createdAt: -1 })
                .lean();

            return tickets;
        } catch (error) {
            throw new ApiError(500, 'Error fetching user tickets: ' + error.message);
        }
    }
}

export default new SupportTicketService();
