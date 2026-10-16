// Everything Motion can do (animations, gestures, and the layout animations
// that fly cards between places). It's a download of its own, fetched just
// after the home screen is up (LazyMotion in App), so the home screen comes
// first: the `m` components the page uses are bare until it arrives.

import {domMax} from 'motion/react';

export default domMax;
