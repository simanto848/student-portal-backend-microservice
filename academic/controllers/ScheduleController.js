import AIScheduleService from "../services/AIScheduleService.js";

class ScheduleController {
    async generateSchedule(req, res) {
        try {
            const { sessionId, departmentId } = req.body;
            const generatedBy = req.user.id;

            const proposal = await AIScheduleService.generateSchedule(sessionId, generatedBy, departmentId);

            res.status(200).json({
                success: true,
                message: "Schedule generated and saved as proposal",
                data: proposal
            });
        } catch (error) {
            console.error("Generate Schedule Error:", error);
            res.status(500).json({
                success: false,
                message: error.message || "Failed to generate schedule"
            });
        }
    }

    async getProposals(req, res) {
        try {
            const { sessionId } = req.query;
            const proposals = await AIScheduleService.getProposals(sessionId);
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
            const proposal = await AIScheduleService.getProposalById(id);
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
            const result = await AIScheduleService.applyProposal(proposalId);
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
}

export default new ScheduleController();
