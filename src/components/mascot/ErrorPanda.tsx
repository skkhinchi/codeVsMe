import './ErrorPanda.css';

type ErrorPandaProps = {
  className?: string;
  /** Primary error message shown in the speech bubble (max 2 lines). */
  message?: string;
};

/**
 * Cute looping baby-panda mascot for JS run failures.
 * SMIL-animated SVG (transparent background, no audio).
 */
export function ErrorPanda({ className = '', message }: ErrorPandaProps) {
  const errorText = (message ?? '').replace(/\s+/g, ' ').trim();

  return (
    <div className={`error-panda ${className}`.trim()} role="img" aria-label="Cute panda confused by a JavaScript error">
      <svg
        className="error-panda__svg"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 560 500"
        width="100%"
        height="100%"
        overflow="visible"
      >
        <defs>
          <radialGradient id="ep-screen-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FF6B6B" stopOpacity="0.4">
              <animate attributeName="stop-color" values="#FF6B6B;#FF3B30;#FF6B6B" dur="2s" repeatCount="indefinite" />
            </stop>
            <stop offset="100%" stopColor="#FF6B6B" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="ep-drop-shadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#2D3142" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#2D3142" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="ep-body-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#F2F4F7" />
          </linearGradient>

          <linearGradient id="ep-dark-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#343A40" />
            <stop offset="100%" stopColor="#212529" />
          </linearGradient>

          <clipPath id="ep-screen-clip">
            <rect x="210" y="325" width="80" height="50" rx="4" />
          </clipPath>
        </defs>

        <ellipse cx="250" cy="445" rx="140" ry="15" fill="url(#ep-drop-shadow)" />

        <ellipse cx="250" cy="340" rx="90" ry="70" fill="url(#ep-screen-glow)">
          <animate attributeName="opacity" values="0.5;0.8;0.3;0.9;0.5" dur="3s" repeatCount="indefinite" />
        </ellipse>

        <g id="ep-panda">
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0,0; 0,3; 0,0"
            dur="4s"
            repeatCount="indefinite"
          />

          <ellipse cx="250" cy="390" rx="75" ry="60" fill="url(#ep-body-grad)" stroke="#1A1D20" strokeWidth="4" />

          <path
            d="M 160 380 C 140 380 130 425 165 435 C 190 440 195 400 185 385 Z"
            fill="url(#ep-dark-grad)"
            stroke="#1A1D20"
            strokeWidth="4"
          />
          <circle cx="162" cy="412" r="10" fill="#495057" />
          <circle cx="152" cy="397" r="4" fill="#495057" />
          <circle cx="162" cy="394" r="4" fill="#495057" />
          <circle cx="172" cy="397" r="4" fill="#495057" />

          <path
            d="M 340 380 C 360 380 370 425 335 435 C 310 440 305 400 315 385 Z"
            fill="url(#ep-dark-grad)"
            stroke="#1A1D20"
            strokeWidth="4"
          />
          <circle cx="338" cy="412" r="10" fill="#495057" />
          <circle cx="328" cy="397" r="4" fill="#495057" />
          <circle cx="338" cy="394" r="4" fill="#495057" />
          <circle cx="348" cy="397" r="4" fill="#495057" />

          <path
            d="M 180 330 C 150 335 145 380 170 395 C 190 405 200 360 195 340 Z"
            fill="url(#ep-dark-grad)"
            stroke="#1A1D20"
            strokeWidth="4"
          />

          <g id="ep-head-group">
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="0 250 250; -3 250 250; 0 250 250; 4 250 250; 0 250 250"
              dur="6s"
              repeatCount="indefinite"
            />

            <g>
              <circle cx="165" cy="155" r="32" fill="url(#ep-dark-grad)" stroke="#1A1D20" strokeWidth="4" />
              <circle cx="165" cy="155" r="18" fill="#495057" />
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0 165 155; -5 165 155; 0 165 155; 3 165 155; 0 165 155"
                dur="4s"
                repeatCount="indefinite"
              />
            </g>

            <g>
              <circle cx="335" cy="155" r="32" fill="url(#ep-dark-grad)" stroke="#1A1D20" strokeWidth="4" />
              <circle cx="335" cy="155" r="18" fill="#495057" />
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0 335 155; 4 335 155; 0 335 155; -4 335 155; 0 335 155"
                dur="4s"
                repeatCount="indefinite"
              />
            </g>

            <ellipse cx="250" cy="230" rx="85" ry="72" fill="url(#ep-body-grad)" stroke="#1A1D20" strokeWidth="4" />

            <ellipse cx="205" cy="232" rx="24" ry="30" fill="url(#ep-dark-grad)" transform="rotate(-10 205 232)" />
            <ellipse cx="295" cy="232" rx="24" ry="30" fill="url(#ep-dark-grad)" transform="rotate(10 295 232)" />

            <path
              d="M 190 192 Q 205 185 220 195"
              fill="none"
              stroke="#1A1D20"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <path
              d="M 310 192 Q 295 182 280 197"
              fill="none"
              stroke="#1A1D20"
              strokeWidth="3.5"
              strokeLinecap="round"
            />

            <g id="ep-eyes" style={{ transformOrigin: '250px 225px' }}>
              <animateTransform
                attributeName="transform"
                type="scale"
                values="1 1; 1 1; 1 0.1; 1 1; 1 1; 1 1"
                keyTimes="0; 0.45; 0.5; 0.55; 0.8; 1"
                dur="4.5s"
                repeatCount="indefinite"
              />
              <circle cx="210" cy="228" r="10" fill="#000000" />
              <circle cx="207" cy="224" r="4" fill="#FFFFFF" />
              <circle cx="213" cy="231" r="1.5" fill="#FFFFFF" />
              <circle cx="290" cy="228" r="10" fill="#000000" />
              <circle cx="287" cy="224" r="4" fill="#FFFFFF" />
              <circle cx="293" cy="231" r="1.5" fill="#FFFFFF" />
            </g>

            <ellipse cx="250" cy="252" rx="16" ry="11" fill="#FFFFFF" />
            <path d="M 242 248 Q 250 242 258 248 Q 250 252 242 248 Z" fill="#1A1D20" />
            <path
              d="M 244 260 Q 250 264 256 260"
              fill="none"
              stroke="#1A1D20"
              strokeWidth="3"
              strokeLinecap="round"
            />

            <ellipse cx="180" cy="258" rx="10" ry="6" fill="#FFB7B2" opacity="0.5" />
            <ellipse cx="320" cy="258" rx="10" ry="6" fill="#FFB7B2" opacity="0.5" />
          </g>

          <g id="ep-scratching-arm">
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="0 295 320; -75 295 320; -70 295 320; -77 295 320; -70 295 320; -77 295 320; -70 295 320; 0 295 320; 0 295 320"
              keyTimes="0; 0.2; 0.3; 0.4; 0.5; 0.6; 0.7; 0.9; 1"
              dur="4s"
              repeatCount="indefinite"
            />
            <path
              d="M 295 320 C 330 325 350 365 330 390 C 310 405 290 370 295 320 Z"
              fill="url(#ep-dark-grad)"
              stroke="#1A1D20"
              strokeWidth="4"
              strokeLinejoin="round"
            />
          </g>
        </g>

        <g id="ep-laptop">
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0,0; 0,0; -1,1; 1,-1; -1,0; 1,1; 0,0; 0,0"
            keyTimes="0; 0.6; 0.62; 0.64; 0.66; 0.68; 0.7; 1"
            dur="2.5s"
            repeatCount="indefinite"
          />

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
          <rect x="210" y="325" width="80" height="50" rx="4" fill="#1F2937" />

          <g clipPath="url(#ep-screen-clip)">
            <rect x="210" y="325" width="80" height="50" fill="#EF4444">
              <animate attributeName="opacity" values="0.3;0.9;0.3;0.9;0.3" dur="2s" repeatCount="indefinite" />
            </rect>
            <line x1="216" y1="335" x2="240" y2="335" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
            <line x1="216" y1="345" x2="255" y2="345" stroke="#FBBF24" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
            <line x1="216" y1="355" x2="230" y2="355" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" />
            <path d="M 265 350 L 275 360 M 275 350 L 265 360" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round">
              <animate attributeName="opacity" values="0;1;0" dur="1.5s" repeatCount="indefinite" />
            </path>
          </g>

          <rect x="230" y="390" width="40" height="6" rx="2" fill="#374151" />
        </g>

        <g id="ep-smoke-puffs">
          <circle cx="195" cy="330" r="0" fill="#E5E7EB" opacity="0.8">
            <animate attributeName="r" values="0;10;14;0" keyTimes="0;0.4;0.8;1" dur="3s" repeatCount="indefinite" />
            <animate attributeName="cx" values="195;185;175;170" dur="3s" repeatCount="indefinite" />
            <animate attributeName="cy" values="330;300;270;250" dur="3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;0.6;0.2;0" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle cx="305" cy="335" r="0" fill="#E5E7EB" opacity="0.8">
            <animate attributeName="r" values="0;8;12;0" keyTimes="0;0.3;0.7;1" dur="2.5s" begin="1s" repeatCount="indefinite" />
            <animate attributeName="cx" values="305;315;325;330" dur="2.5s" begin="1s" repeatCount="indefinite" />
            <animate attributeName="cy" values="335;310;285;265" dur="2.5s" begin="1s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;0.5;0.2;0" dur="2.5s" begin="1s" repeatCount="indefinite" />
          </circle>
        </g>

        <g id="ep-floating-elements">
          <text x="120" y="280" fontFamily="Consolas, monospace" fontSize="22" fontWeight="bold" fill="#9CA3AF" opacity="0.7">
            {'{ }'}
            <animateTransform attributeName="transform" type="translate" values="0,0; -10,-30; 0,-60" dur="5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0.8;0.4;0" dur="5s" repeatCount="indefinite" />
          </text>

          <text x="350" y="290" fontFamily="Consolas, monospace" fontSize="26" fontWeight="bold" fill="#6B7280" opacity="0.6">
            ;
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0,0; 15,-40; 5,-70"
              dur="4s"
              begin="1.5s"
              repeatCount="indefinite"
            />
            <animate attributeName="opacity" values="0;0.7;0.3;0" dur="4s" begin="1.5s" repeatCount="indefinite" />
          </text>

          <text x="140" y="350" fontFamily="Consolas, monospace" fontSize="18" fontWeight="bold" fill="#9CA3AF" opacity="0.5">
            {'=>'}
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0,0; -20,-25; -15,-50"
              dur="6s"
              begin="0.5s"
              repeatCount="indefinite"
            />
            <animate attributeName="opacity" values="0;0.7;0" dur="6s" begin="0.5s" repeatCount="indefinite" />
          </text>

          <text x="320" y="360" fontFamily="Consolas, monospace" fontSize="20" fontWeight="bold" fill="#4B5563" opacity="0.5">
            {'( )'}
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0,0; 10,-30; -5,-60"
              dur="5.5s"
              begin="2s"
              repeatCount="indefinite"
            />
            <animate attributeName="opacity" values="0;0.8;0" dur="5.5s" begin="2s" repeatCount="indefinite" />
          </text>

          <g opacity="0.8">
            <text x="305" y="318" fontSize="18">
              🐞
            </text>
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0,0; 35,-25; 55,-55; 70,-90"
              dur="7s"
              repeatCount="indefinite"
            />
            <animate attributeName="opacity" values="0;1;0.7;0" dur="7s" repeatCount="indefinite" />
          </g>
        </g>

        {/* Large speech bubble — readable error, clear of the face */}
        <g className="error-panda__bubble" opacity="0">
          <animate
            attributeName="opacity"
            values="0;1;1;1;1;1;0.9;1"
            keyTimes="0;0.06;0.2;0.5;0.7;0.85;0.92;1"
            dur="7s"
            repeatCount="indefinite"
          />
          <rect x="355" y="72" width="195" height="108" rx="18" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="3.5" />
          <path d="M355 118 L338 130 L355 142 Z" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="3.5" strokeLinejoin="round" />
          <path d="M358 116 L358 140 L355 130 Z" fill="#FFFFFF" />
          <foreignObject x="368" y="84" width="170" height="84">
            <div className="error-panda__bubble-content" {...({ xmlns: 'http://www.w3.org/1999/xhtml' } as object)}>
              <p className="error-panda__bubble-title">Oops...</p>
              <p className="error-panda__bubble-error">
                {errorText || 'Something went wrong while running your code.'}
              </p>
            </div>
          </foreignObject>
        </g>
      </svg>
      <p className="error-panda__caption">Don&apos;t worry — every bug is just a puzzle in disguise.</p>
    </div>
  );
}
