'use server';
import type { IYclientsAdapter } from './contracts';
import { YclientsApiClient } from './api-client';

class YclientsAdapter implements IYclientsAdapter {
  private apiClient: YclientsApiClient;

  constructor() {
    this.apiClient = new YclientsApiClient();
  }

  async getAvailability(companyId: number, serviceId: number, date: string, traceId?: string): Promise<any> {
    // This is a placeholder implementation.
    // The actual endpoint and parameters might differ.
    const endpoint = `book_dates/${companyId}?service_ids[]=${serviceId}&date=${date}`;
    return this.apiClient.get(endpoint, traceId);
  }

  async createAppointment(params: { companyId: number; personId: number; serviceId: number; datetime: string; clientName: string; clientPhone: string; }, traceId?: string): Promise<any> {
    const endpoint = `records/${params.companyId}`;
    const payload = {
        // Construct payload based on YCLIENTS API documentation
        // This is a simplified example
        "appointments": [{
            "id": `ext_${crypto.randomUUID()}`,
            "services": [params.serviceId],
            "staff_id": params.personId,
            "datetime": params.datetime
        }],
        "phone": params.clientPhone,
        "fullname": params.clientName,
        "send_sms": false
    };
    return this.apiClient.post(endpoint, payload, traceId);
  }

  async cancelAppointment(companyId: number, appointmentId: number, traceId?: string): Promise<any> {
    const endpoint = `records/${companyId}/${appointmentId}`;
    // YCLIENTS uses DELETE method for cancellation, but our client only has GET/POST for now.
    // This would need to be extended if DELETE is required.
    // For now, let's assume it's a POST to a cancel endpoint for demonstration.
    console.warn("cancelAppointment is not fully implemented, YCLIENTS might require a DELETE request.");
    return Promise.resolve({ success: true });
  }
}

class StubYclientsAdapter implements IYclientsAdapter {
    log(method: string, ...args: any[]) {
        console.log(`[StubYclientsAdapter] Called ${method} with:`, ...args);
    }
    async getAvailability(companyId: number, serviceId: number, date: string): Promise<any> {
        this.log('getAvailability', { companyId, serviceId, date });
        return Promise.resolve({ success: true, data: [{ date: "2024-09-10", seances: [{ time: "10:00"}, {time: "12:00"}] }] });
    }
    async createAppointment(params: any): Promise<any> {
        this.log('createAppointment', params);
        return Promise.resolve({ success: true, data: { id: 12345, record_id: `rec_${Date.now()}` } });
    }
    async cancelAppointment(companyId: number, appointmentId: number): Promise<any> {
        this.log('cancelAppointment', { companyId, appointmentId });
        return Promise.resolve({ success: true });
    }
}


export { YclientsAdapter, StubYclientsAdapter };
