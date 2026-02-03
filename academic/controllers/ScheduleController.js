import AutoSchedulerService from "../services/AutoSchedulerService.js";

class ScheduleController {
    /**
     * Generate schedule using Auto Scheduler (No third-party)
     * Supports: single batch, multiple batches, department, or all
     */
    async generateSchedule(req, res) {
        try {
            const {
                sessionId,
                departmentId,
                batchIds,               // Array of batch IDs for multi-batch selection
                selectionMode,          // 'single_batch', 'multi_batch', 'department', 'all'
                classDurationMinutes,   // Default class duration in minutes (default: 75 = 1h 15m)
                classDurations,         // { theory: 75, lab: 150, project: 150 }
                workingDays,            // ['Saturday', 'Sunday', 'Wednesday', 'Thursday']
                offDays,                // ['Monday', 'Tuesday', 'Friday']
                customTimeSlots,        // { day: { startTime, endTime, breakStart, breakEnd }, evening: {...} }
                preferredRooms          // { theory: "roomId", lab: "roomId" }
            } = req.body;

            const generatedBy = req.user.id;
            if (!sessionId) {
                return res.status(400).json({
                    success: false,
                    message: "Session ID is required"
                });
            }

            const result = await AutoSchedulerService.generateSchedule(
                sessionId,
                generatedBy,
                {
                    batchIds,
                    departmentId,
                    selectionMode,
                    classDurationMinutes,
                    classDurations,
                    workingDays,
                    offDays,
                    customTimeSlots,
                    preferredRooms
                }
            );

            res.status(200).json({
                success: true,
                message: `Schedule generated successfully. ${result.stats.scheduled} classes scheduled.`,
                data: result.proposal,
                stats: result.stats
            });
        } catch (error) {
            if (error.type === 'VALIDATION_ERROR') {
                return res.status(400).json({
                    success: false,
                    message: error.message,
                    errors: error.errors,
                    unassignedCourses: error.unassignedCourses
                });
            }

            res.status(500).json({
                success: false,
                message: error.message || "Failed to generate schedule"
            });
        }
    }

    /**
     * Validate prerequisites before generating schedule
     */
    async validateSchedulePrerequisites(req, res) {
        try {
            const { sessionId, batchIds, departmentId } = req.body;
            if (!sessionId) {
                return res.status(400).json({
                    success: false,
                    message: "Session ID is required"
                });
            }

            const validation = await AutoSchedulerService.validatePrerequisites(
                sessionId,
                batchIds,
                departmentId
            );

            res.status(200).json({
                success: true,
                data: {
                    valid: validation.valid,
                    errors: validation.errors,
                    warnings: validation.warnings,
                    unassignedCourses: validation.unassignedCourses || []
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message || "Failed to validate prerequisites"
            });
        }
    }

    async getProposals(req, res) {
        try {
            const { sessionId } = req.query;
            const proposals = await AutoSchedulerService.getProposals(sessionId);
            res.status(200).json({
                success: true,
                data: proposals
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async getProposalById(req, res) {
        try {
            const { id } = req.params;
            const proposal = await AutoSchedulerService.getProposalById(id);
            if (!proposal) {
                return res.status(404).json({
                    success: false,
                    message: "Proposal not found"
                });
            }

            res.status(200).json({
                success: true,
                data: proposal
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async applyProposal(req, res) {
        try {
            const { proposalId } = req.params;
            const result = await AutoSchedulerService.applyProposal(proposalId);
            res.status(200).json({
                success: true,
                message: "Schedule applied successfully",
                data: result
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async deleteProposal(req, res) {
        try {
            const { proposalId } = req.params;
            const result = await AutoSchedulerService.deleteProposal(proposalId);
            res.status(200).json({
                success: true,
                message: result.message,
                data: result
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async checkConflicts(req, res) {
        try {
            const { batchIds, sessionId } = req.body;
            if (!batchIds || !Array.isArray(batchIds) || batchIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Batch IDs array is required"
                });
            }

            const conflicts = await AutoSchedulerService.checkExistingConflicts(batchIds, sessionId);
            res.status(200).json({
                success: true,
                data: {
                    hasConflicts: conflicts.length > 0,
                    count: conflicts.length,
                    conflicts
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Close schedules for specific batches
     * Closed schedules won't conflict with new schedule generation
     */
    async closeSchedulesForBatches(req, res) {
        try {
            const { batchIds } = req.body;
            if (!batchIds || !Array.isArray(batchIds) || batchIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Batch IDs array is required"
                });
            }

            const result = await AutoSchedulerService.closeSchedulesForBatches(batchIds);
            res.status(200).json({
                success: true,
                message: result.message,
                data: result
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Close all schedules for a session
     */
    async closeSchedulesForSession(req, res) {
        try {
            const { sessionId } = req.body;
            if (!sessionId) {
                return res.status(400).json({
                    success: false,
                    message: "Session ID is required"
                });
            }

            const result = await AutoSchedulerService.closeSchedulesForSession(sessionId);
            res.status(200).json({
                success: true,
                message: result.message,
                data: result
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Reopen schedules for specific batches
     */
    async reopenSchedulesForBatches(req, res) {
        try {
            const { batchIds } = req.body;
            if (!batchIds || !Array.isArray(batchIds) || batchIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Batch IDs array is required"
                });
            }

            const result = await AutoSchedulerService.reopenSchedulesForBatches(batchIds);
            res.status(200).json({
                success: true,
                message: result.message,
                data: result
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Get schedule status summary
     */
    async getScheduleStatusSummary(req, res) {
        try {
            const { batchIds } = req.query;
            const parsedBatchIds = batchIds ? batchIds.split(',') : null;
            const summary = await AutoSchedulerService.getScheduleStatusSummary(parsedBatchIds);
            res.status(200).json({
                success: true,
                data: summary
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Get active schedules (recurring weekly view)
     */
    async getActiveSchedules(req, res) {
        try {
            const { batchIds } = req.query;
            const parsedBatchIds = batchIds ? batchIds.split(',') : null;
            const schedules = await AutoSchedulerService.getActiveSchedules(parsedBatchIds);
            res.status(200).json({
                success: true,
                data: schedules
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}

export default new ScheduleController();
