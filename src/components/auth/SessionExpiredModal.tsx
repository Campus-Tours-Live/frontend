"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { subscribeAuthGate, cancelAuth } from "@/lib/auth";
import { Button, GoogleMark, Modal, SectionHeading, Spinner } from "@/components/ui";

/**
 * Re-auth modal, styled like the /signin card (illustration + content) but shown
 * as an overlay. It opens when the client auth gate fires — i.e. an in-page request
 * received a 401 carrying `Auth-Required: reauthenticate` (via subscribeAuthGate).
 * "Continue with Google" navigates the CURRENT tab to the Google sign-in flow (no
 * popup / new tab); the BFF brings the user straight back to the page they were on
 * via returnTo. Note: a full-page redirect unloads the page, so unsaved form input
 * is not preserved across it.
 */
export function SessionExpiredModal() {
  const [open, setOpen] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => subscribeAuthGate(setOpen), []);

  // Same-tab redirect: go to Google sign-in, then come back to this exact page.
  const signIn = () => {
    setRedirecting(true);
    const returnTo = window.location.pathname + window.location.search;
    window.location.assign(`/auth/login?intent=signin&returnTo=${encodeURIComponent(returnTo)}`);
  };

  return (
    <Modal
      open={open}
      onClose={cancelAuth}
      labelledBy="reauth-title"
      className="max-w-[720px] overflow-hidden lg:max-w-[920px]"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 sm:items-stretch lg:min-h-[560px] lg:grid-cols-[1fr_1.15fr]">
        {/* Illustration — banner on small screens, side panel on sm+. */}
        <div className="relative aspect-[16/9] w-full overflow-hidden sm:hidden">
          <Image
            src="/assets/signin.png"
            alt=""
            fill
            sizes="100vw"
            className="scale-105 object-cover object-[55%_70%]"
          />
        </div>
        <div className="relative hidden overflow-hidden sm:block">
          <Image
            src="/assets/signin.png"
            alt=""
            fill
            sizes="360px"
            className="scale-105 object-cover object-center"
          />
        </div>

        {/* Content */}
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
            <Button variant="ghost" block onClick={cancelAuth} disabled={redirecting}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
