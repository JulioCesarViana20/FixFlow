import { CURRENT_LEGAL_VERSIONS } from "../config/legal.js";

export class ConsentService {
  constructor(repository) { this.repository = repository; }

  validate(acceptance) {
    const required = ["PRIVACY_POLICY", "TERMS_OF_USE"];
    for (const documentType of required) {
      const document = acceptance?.[documentType] || acceptance?.[documentType === "PRIVACY_POLICY" ? "privacyPolicy" : "termsOfUse"];
      if (!document?.accepted || document.version !== CURRENT_LEGAL_VERSIONS[documentType]) throw new Error("LEGAL_ACCEPTANCE_REQUIRED");
    }
  }

  record({ userId, workspaceId, acceptance, request }) {
    this.validate(acceptance);
    const acceptedAt = new Date().toISOString();
    for (const documentType of ["PRIVACY_POLICY", "TERMS_OF_USE"]) {
      const document = acceptance[documentType] || acceptance[documentType === "PRIVACY_POLICY" ? "privacyPolicy" : "termsOfUse"];
      this.repository.saveAcceptance({ id: crypto.randomUUID(), userId, workspaceId, documentType, documentVersion: document.version, acceptedAt, ipAddress: request?.socket?.remoteAddress || null, userAgent: request?.headers?.["user-agent"] || null, createdAt: acceptedAt });
    }
  }
}
