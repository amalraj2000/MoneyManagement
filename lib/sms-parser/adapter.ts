/**
 * Adapter boundary for future native Android SMS integration.
 * A browser/PWA cannot read SMS. A native wrapper (e.g. Capacitor plugin with
 * explicit READ_SMS user consent and Play Store policy review) would implement
 * this interface and feed raw message strings into parseBankSms().
 */
export interface SmsSourceAdapter {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  requestPermission(): Promise<boolean>;
  fetchRecent(sinceISO: string): Promise<string[]>;
}

/** Default web implementation: no automatic access; users paste messages manually. */
export const manualPasteAdapter: SmsSourceAdapter = {
  name: "manual-paste",
  isAvailable: async () => false,
  requestPermission: async () => false,
  fetchRecent: async () => [],
};
