"use client";

/**
 * Rendered by the admin layout. Hand control is never offered on the editing
 * surfaces, and this reports that without the public bundle ever having to
 * know what the admin path is called.
 */

import {useEffect} from 'react';
import {useGestures} from './GestureProvider';

export default function GestureLockout() {
  const {lockOut} = useGestures();
  useEffect(() => lockOut(), [lockOut]);
  return null;
}
