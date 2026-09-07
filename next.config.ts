import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Server Actions cap the WHOLE multipart body at 1 MB by default, not
      // just the file — the activity form's text fields ride in the same
      // body as the cover image. lib/blob.ts's MAX_BYTES (4 MB) is the
      // largest image we accept, so this limit must stay comfortably above
      // that or a valid photo gets rejected by the framework before
      // uploadCover ever runs, throwing away everything the leader typed.
      // Keep this at MAX_BYTES + headroom for the text fields and
      // multipart overhead; if MAX_BYTES ever changes, raise this too.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
