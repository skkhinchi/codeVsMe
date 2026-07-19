import './HappyPanda.css';

type HappyPandaProps = {
  className?: string;
};

/**
 * Celebrating baby-panda mascot for successful JS runs.
 * SMIL-animated SVG (transparent background, no audio).
 */
export function HappyPanda({ className = '' }: HappyPandaProps) {
  return (
    <div className={`happy-panda ${className}`.trim()} role="img" aria-label="Cute panda celebrating successful code">
      <svg
        className="happy-panda__svg"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 500 500"
        width="100%"
        height="100%"
        overflow="visible"
      >
        <defs>
          <radialGradient id="hp-screen-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3FB950" stopOpacity="0.45">
              <animate attributeName="stop-color" values="#3FB950;#56D364;#3FB950" dur="2.2s" repeatCount="indefinite" />
            </stop>
            <stop offset="100%" stopColor="#3FB950" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="hp-drop-shadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#2D3142" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#2D3142" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="hp-body-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#F2F4F7" />
          </linearGradient>

          <linearGradient id="hp-dark-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#343A40" />
            <stop offset="100%" stopColor="#212529" />
          </linearGradient>

          <clipPath id="hp-screen-clip">
            <rect x="210" y="325" width="80" height="50" rx="4" />
          </clipPath>
        </defs>

        <ellipse cx="250" cy="445" rx="140" ry="15" fill="url(#hp-drop-shadow)" />

        <ellipse cx="250" cy="340" rx="90" ry="70" fill="url(#hp-screen-glow)">
          <animate attributeName="opacity" values="0.45;0.85;0.5;0.9;0.45" dur="2.8s" repeatCount="indefinite" />
        </ellipse>

        {/* Soft confetti dots */}
        <g id="hp-confetti">
          <circle cx="120" cy="160" r="5" fill="#56D364">
            <animateTransform attributeName="transform" type="translate" values="0,0; -8,40; -4,90" dur="3.2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;1;0.6;0" dur="3.2s" repeatCount="indefinite" />
          </circle>
          <circle cx="380" cy="150" r="4" fill="#79C0FF">
            <animateTransform attributeName="transform" type="translate" values="0,0; 10,35; 6,85" dur="3.6s" begin="0.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;1;0.5;0" dur="3.6s" begin="0.4s" repeatCount="indefinite" />
          </circle>
          <rect x="145" y="200" width="8" height="8" rx="2" fill="#FFA657" transform="rotate(20 149 204)">
            <animateTransform attributeName="transform" type="translate" values="0,0; -12,30; -8,75" dur="3.4s" begin="0.8s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0.9;0.4;0" dur="3.4s" begin="0.8s" repeatCount="indefinite" />
          </rect>
          <rect x="350" y="210" width="7" height="7" rx="2" fill="#D2A8FF" transform="rotate(-15 353 213)">
            <animateTransform attributeName="transform" type="translate" values="0,0; 14,28; 10,70" dur="3s" begin="1.1s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;1;0.5;0" dur="3s" begin="1.1s" repeatCount="indefinite" />
          </rect>
        </g>

        <g id="hp-panda">
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0,0; 0,-6; 0,0; 0,-4; 0,0"
            dur="2.4s"
            repeatCount="indefinite"
          />

          <ellipse cx="250" cy="390" rx="75" ry="60" fill="url(#hp-body-grad)" stroke="#1A1D20" strokeWidth="4" />

          <path
            d="M 160 380 C 140 380 130 425 165 435 C 190 440 195 400 185 385 Z"
            fill="url(#hp-dark-grad)"
            stroke="#1A1D20"
            strokeWidth="4"
          />
          <circle cx="162" cy="412" r="10" fill="#495057" />
          <circle cx="152" cy="397" r="4" fill="#495057" />
          <circle cx="162" cy="394" r="4" fill="#495057" />
          <circle cx="172" cy="397" r="4" fill="#495057" />

          <path
            d="M 340 380 C 360 380 370 425 335 435 C 310 440 305 400 315 385 Z"
            fill="url(#hp-dark-grad)"
            stroke="#1A1D20"
            strokeWidth="4"
          />
          <circle cx="338" cy="412" r="10" fill="#495057" />
          <circle cx="328" cy="397" r="4" fill="#495057" />
          <circle cx="338" cy="394" r="4" fill="#495057" />
          <circle cx="348" cy="397" r="4" fill="#495057" />

          {/* Left arm waving up */}
          <g id="hp-wave-arm">
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="0 175 320; -35 175 320; -15 175 320; -40 175 320; 0 175 320"
              dur="2.2s"
              repeatCount="indefinite"
            />
            <path
              d="M 180 330 C 145 300 120 270 145 250 C 165 235 190 280 195 320 Z"
              fill="url(#hp-dark-grad)"
              stroke="#1A1D20"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <ellipse cx="145" cy="248" rx="14" ry="11" fill="url(#hp-dark-grad)" stroke="#1A1D20" strokeWidth="3" />
            <ellipse cx="145" cy="248" rx="7" ry="5" fill="#F8F9FA" />
          </g>

          <g id="hp-head-group">
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="0 250 250; 4 250 250; 0 250 250; -3 250 250; 0 250 250"
              dur="3.5s"
              repeatCount="indefinite"
            />

            <g>
              <circle cx="165" cy="155" r="32" fill="url(#hp-dark-grad)" stroke="#1A1D20" strokeWidth="4" />
              <circle cx="165" cy="155" r="18" fill="#495057" />
            </g>
            <g>
              <circle cx="335" cy="155" r="32" fill="url(#hp-dark-grad)" stroke="#1A1D20" strokeWidth="4" />
              <circle cx="335" cy="155" r="18" fill="#495057" />
            </g>

            <ellipse cx="250" cy="230" rx="85" ry="72" fill="url(#hp-body-grad)" stroke="#1A1D20" strokeWidth="4" />

            <ellipse cx="205" cy="232" rx="24" ry="30" fill="url(#hp-dark-grad)" transform="rotate(-10 205 232)" />
            <ellipse cx="295" cy="232" rx="24" ry="30" fill="url(#hp-dark-grad)" transform="rotate(10 295 232)" />

            {/* Happy curved eyebrows */}
            <path d="M 188 198 Q 205 188 222 200" fill="none" stroke="#1A1D20" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M 312 198 Q 295 188 278 200" fill="none" stroke="#1A1D20" strokeWidth="3.5" strokeLinecap="round" />

            {/* Happy closed-smile eyes that blink open occasionally */}
            <g id="hp-eyes">
              <g>
                <animate attributeName="opacity" values="1;1;0;0;1;1" keyTimes="0;0.42;0.45;0.52;0.55;1" dur="4s" repeatCount="indefinite" />
                <path d="M 198 228 Q 210 218 222 228" fill="none" stroke="#000" strokeWidth="4" strokeLinecap="round" />
                <path d="M 278 228 Q 290 218 302 228" fill="none" stroke="#000" strokeWidth="4" strokeLinecap="round" />
              </g>
              <g opacity="0">
                <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.42;0.45;0.52;0.55;1" dur="4s" repeatCount="indefinite" />
                <circle cx="210" cy="228" r="10" fill="#000" />
                <circle cx="207" cy="224" r="4" fill="#FFF" />
                <circle cx="290" cy="228" r="10" fill="#000" />
                <circle cx="287" cy="224" r="4" fill="#FFF" />
              </g>
            </g>

            <ellipse cx="250" cy="252" rx="16" ry="11" fill="#FFFFFF" />
            <path d="M 242 248 Q 250 242 258 248 Q 250 252 242 248 Z" fill="#1A1D20" />

            {/* Big happy smile */}
            <path
              d="M 228 262 Q 250 282 272 262"
              fill="none"
              stroke="#1A1D20"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path d="M 236 266 Q 250 276 264 266" fill="#FF8A80" opacity="0.35" />

            <ellipse cx="180" cy="258" rx="10" ry="6" fill="#FFB7B2" opacity="0.55" />
            <ellipse cx="320" cy="258" rx="10" ry="6" fill="#FFB7B2" opacity="0.55" />
          </g>

          {/* Right arm resting happily on laptop */}
          <g>
            <path
              d="M 295 320 C 330 325 345 360 325 385 C 305 400 285 360 295 320 Z"
              fill="url(#hp-dark-grad)"
              stroke="#1A1D20"
              strokeWidth="4"
              strokeLinejoin="round"
            />
          </g>
        </g>

        <g id="hp-laptop">
          <path
            d="M 180 395 L 320 395 L 340 420 L 160 420 Z"
            fill="#D1D5DB"
            stroke="#1A1D20"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <polygon points="190,400 310,400 325,416 175,416" fill="#9CA3AF" />
          <line x1="235" y1="418" x2="265" y2="418" stroke="#9CA3AF" strokeWidth="3" strokeLinecap="round" />

          <rect x="204" y="320" width="92" height="75" rx="6" fill="#4B5563" stroke="#1A1D20" strokeWidth="4" />
          <rect x="210" y="325" width="80" height="50" rx="4" fill="#0D1117" />

          <g clipPath="url(#hp-screen-clip)">
            <rect x="210" y="325" width="80" height="50" fill="#238636">
              <animate attributeName="opacity" values="0.55;0.9;0.55" dur="2s" repeatCount="indefinite" />
            </rect>
            <line x1="216" y1="335" x2="250" y2="335" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
            <line x1="216" y1="345" x2="268" y2="345" stroke="#56D364" strokeWidth="3" strokeLinecap="round" opacity="0.95" />
            <line x1="216" y1="355" x2="240" y2="355" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity="0.75" />
            {/* Checkmark */}
            <path d="M 258 348 L 266 356 L 280 338" fill="none" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <animate attributeName="opacity" values="0.6;1;0.6" dur="1.6s" repeatCount="indefinite" />
            </path>
          </g>

          <rect x="230" y="390" width="40" height="6" rx="2" fill="#374151" />
        </g>

        {/* Sparkles near laptop */}
        <g id="hp-sparkles" fill="#56D364">
          <path d="M190 310 l3 8 8 3 -8 3 -3 8 -3-8 -8-3 8-3 Z">
            <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" />
            <animateTransform attributeName="transform" type="scale" values="0.6;1.1;0.6" dur="2s" repeatCount="indefinite" additive="sum" />
          </path>
          <path d="M310 305 l2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5-6 -6-2.5 6-2.5 Z" fill="#79C0FF">
            <animate attributeName="opacity" values="0;1;0" dur="2.3s" begin="0.6s" repeatCount="indefinite" />
          </path>
        </g>

        <g id="hp-floating">
          <text x="110" y="270" fontFamily="Consolas, monospace" fontSize="20" fontWeight="bold" fill="#56D364" opacity="0.75">
            ✓
            <animateTransform attributeName="transform" type="translate" values="0,0; -8,-28; 0,-55" dur="4.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0.9;0.4;0" dur="4.5s" repeatCount="indefinite" />
          </text>
          <text x="360" y="280" fontFamily="Consolas, monospace" fontSize="16" fontWeight="bold" fill="#79C0FF" opacity="0.7">
            log
            <animateTransform attributeName="transform" type="translate" values="0,0; 12,-30; 4,-60" dur="5s" begin="0.8s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0.85;0" dur="5s" begin="0.8s" repeatCount="indefinite" />
          </text>
          <text x="130" y="340" fontSize="18">
            ✨
            <animateTransform attributeName="transform" type="translate" values="0,0; -15,-25; -10,-50" dur="4.8s" begin="0.3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;1;0" dur="4.8s" begin="0.3s" repeatCount="indefinite" />
          </text>
          <text x="340" y="350" fontSize="18">
            🎉
            <animateTransform attributeName="transform" type="translate" values="0,0; 10,-28; 5,-55" dur="5.2s" begin="1.2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;1;0" dur="5.2s" begin="1.2s" repeatCount="indefinite" />
          </text>
        </g>

        {/* Clean speech bubble — upper-right, clear of face & ears */}
        <g opacity="0">
          <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.2;0.28;0.55;0.65;1" dur="4.5s" repeatCount="indefinite" />
          <rect x="378" y="108" width="88" height="44" rx="14" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="3" />
          <path d="M378 130 L366 138 L378 146 Z" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="3" strokeLinejoin="round" />
          <path d="M380 128 L380 144 L378 138 Z" fill="#FFFFFF" />
          <text
            x="422"
            y="136"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#1A7F37"
            fontFamily="system-ui, sans-serif"
            fontSize="18"
            fontWeight="700"
          >
            Yay!
          </text>
        </g>
      </svg>
      <p className="happy-panda__caption">Nice run — your code is looking great!</p>
    </div>
  );
}
