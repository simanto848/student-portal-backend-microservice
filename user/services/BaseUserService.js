import { ApiError } from 'shared';

class BaseUserService {
    constructor(model, itemName) {
        this.model = model;
        this.itemName = itemName;
    }

    async getById(id) {
        try {
            const item = await this.model.findById(id)
                .select('-password')
                .populate('profile')
                .lean();

            if (!item) {
                throw new ApiError(404, `${this.itemName} not found`);
            }
            return item;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, `Error fetching ${this.itemName.toLowerCase()}: ` + error.message);
        }
    }

    async delete(id) {
        try {
            const item = await this.model.findById(id);
            if (!item) {
                throw new ApiError(404, `${this.itemName} not found`);
            }
            await item.softDelete();
            return { message: `${this.itemName} deleted successfully` };
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, `Error deleting ${this.itemName.toLowerCase()}: ` + error.message);
        }
    }

    async restore(id) {
        try {
            const item = await this.model.findOne({ _id: id, deletedAt: { $ne: null } });
            if (!item) throw new ApiError(404, `${this.itemName} not found`);
            await item.restore();
            return { message: `${this.itemName} restored successfully` };
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, `Error restoring ${this.itemName.toLowerCase()}: ` + error.message);
        }
    }

    async getDeleted() {
        try {
            return await this.model.find({ deletedAt: { $ne: null } })
                .select('-password')
                .populate('profile')
                .lean();
        } catch (error) {
            throw new ApiError(500, `Error fetching deleted ${this.itemName.toLowerCase()}s: ` + error.message);
        }
    }

    async deletePermanently(id) {
        try {
            const item = await this.model.findOne({ _id: id, deletedAt: { $ne: null } });
            if (!item) throw new ApiError(404, `Deleted ${this.itemName.toLowerCase()} not found`);
            await item.deletePermanently ? item.deletePermanently() : item.deleteOne();
            return { message: `${this.itemName} deleted permanently successfully` };
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, `Error deleting ${this.itemName.toLowerCase()} permanently: ` + error.message);
        }
    }

    // IP Management
    async addRegisteredIp(id, ipAddress) {
        try {
            const item = await this.model.findById(id);
            if (!item) throw new ApiError(404, `${this.itemName} not found`);

            if (item.registeredIpAddress && item.registeredIpAddress.includes(ipAddress)) {
                throw new ApiError(409, 'IP address already registered');
            }

            if (!item.registeredIpAddress) item.registeredIpAddress = [];
            item.registeredIpAddress.push(ipAddress);

            await item.save({ validateModifiedOnly: true });
            return await this.getById(id);
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error adding registered IP: ' + error.message);
        }
    }

    async removeRegisteredIp(id, ipAddress) {
        try {
            const item = await this.model.findById(id);
            if (!item) throw new ApiError(404, `${this.itemName} not found`);

            if (!item.registeredIpAddress || !item.registeredIpAddress.includes(ipAddress)) {
                throw new ApiError(404, 'IP address not found in registered list');
            }

            item.registeredIpAddress = item.registeredIpAddress.filter(ip => ip !== ipAddress);
            await item.save({ validateModifiedOnly: true });
            return await this.getById(id);
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error removing registered IP: ' + error.message);
        }
    }

    async updateRegisteredIps(id, ipAddresses) {
        try {
            const item = await this.model.findByIdAndUpdate(
                id,
                { $set: { registeredIpAddress: ipAddresses } },
                { new: true, runValidators: false }
            ).select('-password').populate('profile');

            if (!item) throw new ApiError(404, `${this.itemName} not found`);
            return item;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error updating registered IPs: ' + error.message);
        }
    }
}

export default BaseUserService;
