import { ApiResponse } from 'shared';
import supportTicketService from '../services/supportTicketService.js';

class SupportTicketController {
    async getAll(req, res, next) {
        try {
            const { page, limit, search, status, priority, category, assignedTo } = req.query;
            const options = {
                userRole: req.user.role || req.user.userType,
                userId: req.user.id,
            };

            if (page || limit) {
                options.pagination = {
                    page: parseInt(page) || 1,
                    limit: parseInt(limit) || 10,
                };
            }

            if (search) options.search = search;

            options.filters = {};
            if (status) options.filters.status = status;
            if (priority) options.filters.priority = priority;
            if (category) options.filters.category = category;
            if (assignedTo) options.filters.assignedTo = assignedTo;

            const result = await supportTicketService.getAll(options);
            return ApiResponse.success(res, result, 'Tickets retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async getById(req, res, next) {
        try {
            const ticket = await supportTicketService.getById(req.params.id, {
                userRole: req.user.role || req.user.userType,
                userId: req.user.id,
            });
            return ApiResponse.success(res, ticket, 'Ticket retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async create(req, res, next) {
        try {
            const ticketData = {
                ...req.body,
                createdBy: req.user.id,
                createdByType: req.user.userType || 'admin',
                createdByName: req.user.fullName,
                createdByEmail: req.user.email,
            };

            const ticket = await supportTicketService.create(ticketData);
            return ApiResponse.created(res, ticket, 'Ticket created successfully');
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            const ticket = await supportTicketService.update(
                req.params.id,
                req.body,
                req.user.id
            );
            return ApiResponse.success(res, ticket, 'Ticket updated successfully');
        } catch (error) {
            next(error);
        }
    }

    async assign(req, res, next) {
        try {
            const { assigneeId } = req.body;
            const ticket = await supportTicketService.assign(
                req.params.id,
                assigneeId,
                req.user.fullName
            );
            return ApiResponse.success(res, ticket, 'Ticket assigned successfully');
        } catch (error) {
            next(error);
        }
    }

    async addMessage(req, res, next) {
        try {
            const messageData = {
                sender: req.user.id,
                senderType: ['super_admin', 'admin', 'moderator'].includes(req.user.role) ? 'moderator' : 'user',
                senderName: req.user.fullName,
                content: req.body.content,
                attachments: req.body.attachments || [],
            };

            const ticket = await supportTicketService.addMessage(req.params.id, messageData);
            return ApiResponse.success(res, ticket, 'Message added successfully');
        } catch (error) {
            next(error);
        }
    }

    async addInternalNote(req, res, next) {
        try {
            const noteData = {
                note: req.body.note,
                addedBy: req.user.id,
                addedByName: req.user.fullName,
            };

            const ticket = await supportTicketService.addInternalNote(req.params.id, noteData);
            return ApiResponse.success(res, ticket, 'Note added successfully');
        } catch (error) {
            next(error);
        }
    }

    async resolve(req, res, next) {
        try {
            const ticket = await supportTicketService.resolve(
                req.params.id,
                req.user.id,
                req.user.fullName,
                req.user.role
            );
            return ApiResponse.success(res, ticket, 'Ticket resolved successfully');
        } catch (error) {
            next(error);
        }
    }

    async close(req, res, next) {
        try {
            const ticket = await supportTicketService.close(
                req.params.id,
                req.user.id,
                req.user.fullName
            );
            return ApiResponse.success(res, ticket, 'Ticket closed successfully');
        } catch (error) {
            next(error);
        }
    }

    async reopen(req, res, next) {
        try {
            const ticket = await supportTicketService.reopen(
                req.params.id,
                req.user.id,
                req.user.fullName
            );
            return ApiResponse.success(res, ticket, 'Ticket reopened successfully');
        } catch (error) {
            next(error);
        }
    }

    async rate(req, res, next) {
        try {
            const ticket = await supportTicketService.rate(req.params.id, req.body);
            return ApiResponse.success(res, ticket, 'Ticket rated successfully');
        } catch (error) {
            next(error);
        }
    }

    async getStatistics(req, res, next) {
        try {
            const statistics = await supportTicketService.getStatistics({
                userId: req.user.id,
                userRole: req.user.role || req.user.userType,
            });
            return ApiResponse.success(res, statistics, 'Statistics retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async getMyTickets(req, res, next) {
        try {
            const tickets = await supportTicketService.getByUser(req.user.id);
            return ApiResponse.success(res, tickets, 'Tickets retrieved successfully');
        } catch (error) {
            next(error);
        }
    }
}

export default new SupportTicketController();
