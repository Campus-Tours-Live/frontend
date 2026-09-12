"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import { cancelAuth, subscribeAuthGate } from "@/lib/auth";
import {
  Button,
  GoogleMark,
  Modal,
  SectionHeading,
  Spinner,
} from "@/components/ui";
import { assetUrl } from "@/lib/assets";

/**
 * Re-authentication modal shown when the auth gate opens.
 * Signing in redirects to Google and returns the user to the current page.
 */
export function SessionExpiredModal() {
  const [open, setOpen] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => subscribeAuthGate(setOpen), []);

  const signIn = () => {
    setRedirecting(true);

    const returnTo = window.location.pathname + window.location.search;

    window.location.assign(
      `/auth/login?intent=signin&returnTo=${encodeURIComponent(returnTo)}`,
    );
  };

  return (
    <Modal
      open={open}
      onClose={cancelAuth}
      labelledBy="reauth-title"
      className="max-w-[720px] overflow-hidden lg:max-w-[920px]"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 sm:items-stretch lg:min-h-[560px] lg:grid-cols-[1fr_1.15fr]">
        <div className="relative aspect-[16/9] w-full overflow-hidden sm:hidden">
          <Image
            src={assetUrl("signin.png")}
            alt=""
            fill
            sizes="100vw"
            className="scale-105 object-cover object-[55%_70%]"
          />
        </div>

        <div className="relative hidden overflow-hidden sm:block">
          <Image
            src={assetUrl("signin.png")}
            alt=""
            fill
            sizes="360px"
            className="scale-105 object-cover object-center"
          />
        </div>

        <div className="flex flex-col justify-center gap-5 p-7 sm:p-9 lg:gap-6 lg:p-12">
          <SectionHeading
            eyebrow="Welcome back"
            title="Sign in to continue"
            titleId="reauth-title"
            level={3}
            lead="We’ll take you to Google to sign in and bring you straight back to this page."
            className="[&_h3]:lg:whitespace-nowrap [&_h3]:lg:text-[30px] [&_h3]:lg:leading-[1.15] [&_p]:text-ui-lg [&_p]:lg:text-[16px]"
          />

          <div className="flex flex-col gap-3">
            <Button
              variant="secondary"
              block
              onClick={signIn}
              disabled={redirecting}
              className="gap-3"
            >
              {redirecting ? <Spinner /> : <GoogleMark />}
              {redirecting ? "Redirecting…" : "Continue with Google"}
            </Button>

            <Button
              variant="ghost"
              block
              onClick={cancelAuth}
              disabled={redirecting}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
