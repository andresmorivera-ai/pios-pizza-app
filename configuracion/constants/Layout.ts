import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions (iPhone 11 Pro / X)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

const scale = (size: number) => {
    return (SCREEN_WIDTH / BASE_WIDTH) * size;
};

const verticalScale = (size: number) => {
    return (SCREEN_HEIGHT / BASE_HEIGHT) * size;
};

const moderateScale = (size: number, factor = 0.5) => {
    return size + (scale(size) - size) * factor;
};

// Breakpoints
const isSmallDevice = SCREEN_WIDTH < 375;
const isTablet = SCREEN_WIDTH >= 768;

export const Layout = {
    window: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
    },
    isSmallDevice,
    isTablet,
    // Scaling functions
    scale,
    verticalScale,
    moderateScale,
    // Standard sizes
    spacing: {
        xs: moderateScale(4),
        s: moderateScale(8),
        m: moderateScale(16),
        l: moderateScale(24),
        xl: moderateScale(32),
        xxl: moderateScale(40),
        xxxl: moderateScale(48),
    },
    fontSize: {
        xs: moderateScale(10),
        s: moderateScale(12),
        m: moderateScale(14),
        l: moderateScale(16),
        xl: moderateScale(20),
        xxl: moderateScale(24),
        xxxl: moderateScale(30),
    },
    borderRadius: {
        s: moderateScale(4),
        m: moderateScale(8),
        l: moderateScale(12),
        xl: moderateScale(16),
        xxl: moderateScale(20),
        round: 9999,
    },
    icon: {
        xs: moderateScale(12),
        s: moderateScale(16),
        m: moderateScale(24),
        l: moderateScale(32),
        xl: moderateScale(40),
        xxl: moderateScale(48),
        xxxl: moderateScale(60),
    }
};
