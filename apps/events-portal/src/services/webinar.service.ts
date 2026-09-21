export interface CheckWebinarParams {
  email: string;
  webinarId?: string;
}

export async function checkWebinarRegistration(params: CheckWebinarParams) {
  try {
    // Non-blocking check; return available by default in portal
    return {
      success: true,
      data: { isRegistered: false },
    };
  } catch {
    return { success: false };
  }
}
