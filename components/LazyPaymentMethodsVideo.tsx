"use client";

import dynamic from "next/dynamic";

type LazyPaymentMethodsVideoProps = {
  ariaLabel?: string;
  label?: string;
};

const PaymentMethodsVideo = dynamic<LazyPaymentMethodsVideoProps>(
  () =>
    import("@/components/PaymentMethodsVideo").then(
      (module) => module.PaymentMethodsVideo
    ),
  {
    ssr: false,
    loading: () => (
      <section
        aria-hidden="true"
        className="relative left-1/2 w-[100vw] -translate-x-1/2 overflow-hidden bg-[#050505]"
      >
        <div className="relative aspect-[16/7] w-[100vw] overflow-hidden bg-[#050505] md:aspect-[16/6]" />
      </section>
    )
  }
);

export function LazyPaymentMethodsVideo(props: LazyPaymentMethodsVideoProps) {
  return <PaymentMethodsVideo {...props} />;
}
