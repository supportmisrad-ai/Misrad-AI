declare module 'web-push' {
  export type PushSubscription = {
    endpoint: string;
    expirationTime: number | null;
    keys: {
      p256dh: string;
      auth: string;
    };
  };

  export type RequestOptions = Record<string, unknown>;

  export type WebPush = {
    setVapidDetails: (subject: string, publicKey: string, privateKey: string) => void;
    sendNotification: (subscription: PushSubscription, payload: string, options?: RequestOptions) => Promise<void>;
  };

  const webpush: WebPush;
  export default webpush;
}
