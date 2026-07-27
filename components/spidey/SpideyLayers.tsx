"use client";

import dynamic from "next/dynamic";
import { useSpidey } from "./SpideyProvider";

const WebLattice = dynamic(() => import("./WebLattice"), { ssr: false });

/** Background layers that only exist in web-slinger mode. */
export default function SpideyLayers() {
  const { spidey } = useSpidey();

  return (
    <>
      {spidey && <WebLattice />}
      <div className="skyline" aria-hidden />
      <div className="halftone" aria-hidden />
    </>
  );
}
