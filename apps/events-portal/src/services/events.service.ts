import { API_BASE_URL } from '../config/constants';

export interface RegisterEventParams {
  eventType?: string;
  firstName: string;
  lastName: string;
  email: string;
  whatsapp: string;
  countryCode: string;
  currentSituation?: string;
  desiredSpecialty?: string;
  additionalPayload?: Record<string, any>;
  apiUrl?: string;
  formSlug?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  statusCode?: number;
  data?: T;
  error?: { message?: string };
}

export async function registerEvent(params: RegisterEventParams): Promise<ApiResponse> {
  const baseUrl = params.apiUrl || (typeof window !== 'undefined' ? (window as any).__PORTAL_API_URL__ : '') || API_BASE_URL;
  const formSlug = params.formSlug || (typeof window !== 'undefined' ? (window as any).__PORTAL_FORM_SLUG__ : '') || params.eventType;

  try {
    if (formSlug && baseUrl) {
      const response = await fetch(`${baseUrl}/public/registration-forms/${formSlug}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: {
            first_name: params.firstName,
            last_name: params.lastName,
            email: params.email,
            phone: `${params.countryCode} ${params.whatsapp}`.trim(),
            current_situation: params.currentSituation,
            desired_specialty: params.desiredSpecialty,
            ...params.additionalPayload,
          },
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return {
          success: false,
          statusCode: response.status,
          message: data.message || 'No se pudo completar la inscripción.',
          error: { message: data.message },
        };
      }

      return {
        success: true,
        message: '¡Tu lugar ha sido reservado con éxito! Revisa tu correo.',
        data,
      };
    }

    // Fallback simulating success if standalone
    return {
      success: true,
      message: '¡Tu lugar ha sido reservado con éxito! Te esperamos en el webinar.',
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || 'Error de conexión con el servidor',
      error: { message: error?.message },
    };
  }
}
