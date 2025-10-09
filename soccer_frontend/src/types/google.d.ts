declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: any) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          prompt: (callback?: (notification: any) => void) => void;
        };
        oauth2: {
          initCodeClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: any) => void;
            ux_mode: string;
          }) => {
            requestCode: () => void;
          };
        };
      };
    };
  }
}

export {};
