import type {
  CreateCustomerEnquiryFormData,
  UpdateCustomerEnquiryFormData,
} from '@jg-app/validators'
import { NotFoundError } from '#/lib/errors'
import { enquiriesRepository } from './enquiries.repository'

export const enquiriesService = {
  getAll() {
    return enquiriesRepository.findAll()
  },

  async getById(id: number) {
    const enquiry = await enquiriesRepository.findById(id)
    if (!enquiry) throw new NotFoundError('Customer enquiry')
    return enquiry
  },

  create(data: CreateCustomerEnquiryFormData) {
    return enquiriesRepository.create(data)
  },

  async update(id: number, data: UpdateCustomerEnquiryFormData) {
    await this.getById(id)
    return enquiriesRepository.update(id, data)
  },

  async archive(id: number) {
    await this.update(id, { isActive: false })
  },
}
