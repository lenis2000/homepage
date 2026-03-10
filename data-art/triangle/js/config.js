// Triangle data-art configuration — constants, colors, timing, state enum
(function() {
    'use strict';

    const LOZENGE_COLORS_3D = ['#EDE8E0', '#A0ADB8', '#CCC0B0'];
    const SCALE_ITERATIONS = 4;
    const STEPS_PER_FRAME = 2000;
    const CHAOS_STEPS_PER_FRAME = 1;
    const CHAOS_FRAMES_PER_STEP = 5;
    const MONOTONE_STEPS_PER_FRAME = 1;
    const MONOTONE_FRAMES_PER_STEP = 8;
    const CUBE_SIZE = 1.0;

    // Timing (ms)
    const FLYING_DURATION = 5000;
    const ASSEMBLY_DURATION = 8000;
    const SURFACE_HOLD_DURATION = 3000;
    const CHAOS_DURATION = 12000;
    const MONOTONE_DURATION = 12000;
    const CUBE_SURFACE_BLEND_DURATION = 1600;
    const ASSEMBLY_HOLD_DURATION = 0;
    const Q_CHAOS = 1.0;
    const Q_ORDER = 50.0;

    // Base Penrose triangle shape (12 triangles) — creates hole with winding
    const BASE_SHAPE = [
        { n: -9, j: 5, type: 2 },
        { n: -9, j: 6, type: 1 },
        { n: -9, j: 6, type: 2 },
        { n: -9, j: 7, type: 1 },
        { n: -8, j: 6, type: 2 },
        { n: -8, j: 7, type: 1 },
        { n: -7, j: 6, type: 1 },
        { n: -7, j: 5, type: 2 },
        { n: -7, j: 5, type: 1 },
        { n: -8, j: 5, type: 2 },
        { n: -8, j: 5, type: 1 },
        { n: -9, j: 7, type: 2 }
    ];

    // State machine
    const STATES = {
        HOOK: 'hook',
        LOADING: 'loading',
        FLYING_CUBES: 'flying_cubes',
        ASSEMBLY: 'assembly',
        ASSEMBLY_HOLD: 'assembly_hold',
        TRANSFORMING: 'transforming',
        FROZEN: 'frozen',
        TEXT_SCREEN: 'text_screen'
    };

    // Camera
    const frustumSize = 30;

    // Frozen orbit timing
    const ROTATION_DURATION = 12000;
    const PAUSE_DURATION = 2000;
    const TEXT_SCREEN_DURATION = 40000;
    const HOOK_DURATION = 15000;

    window.TriangleConfig = {
        LOZENGE_COLORS_3D,
        SCALE_ITERATIONS,
        STEPS_PER_FRAME,
        CHAOS_STEPS_PER_FRAME,
        CHAOS_FRAMES_PER_STEP,
        MONOTONE_STEPS_PER_FRAME,
        MONOTONE_FRAMES_PER_STEP,
        CUBE_SIZE,
        FLYING_DURATION,
        ASSEMBLY_DURATION,
        SURFACE_HOLD_DURATION,
        CHAOS_DURATION,
        MONOTONE_DURATION,
        CUBE_SURFACE_BLEND_DURATION,
        ASSEMBLY_HOLD_DURATION,
        Q_CHAOS,
        Q_ORDER,
        BASE_SHAPE,
        STATES,
        frustumSize,
        ROTATION_DURATION,
        PAUSE_DURATION,
        TEXT_SCREEN_DURATION,
        HOOK_DURATION
    };
})();
