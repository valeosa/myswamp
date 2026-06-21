export function SwampScenery({ variant = 'input' }: { variant?: 'input' | 'memory' }) {
  if (variant === 'memory') {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 900 560"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 h-full w-full"
      >
        <path
          d="M0 104 C150 88 250 118 405 101 C560 84 705 116 900 96 L900 560 L0 560 Z"
          fill="#78936f"
          opacity="0.055"
        />
        <path
          d="M0 104 C150 88 250 118 405 101 C560 84 705 116 900 96"
          fill="none"
          stroke="#55704f"
          strokeWidth="1.2"
          opacity="0.2"
        />

        <g fill="none" stroke="#71876a" strokeLinecap="round" opacity="0.19">
          <path d="M12 -8 C28 48 1 94 24 166 C39 214 12 265 22 330" />
          <path d="M38 -10 C55 54 25 116 47 205 C58 248 39 301 54 365" />
          <path d="M72 -8 C80 45 54 100 78 158" />
          <path d="M888 -8 C872 50 899 102 876 174 C861 220 888 276 876 340" />
          <path d="M858 -10 C842 58 875 122 851 207 C839 254 857 309 842 374" />
          <path d="M826 -8 C817 42 842 97 819 164" />
          <path d="M2 54 C78 66 93 17 171 4" />
          <path d="M898 47 C824 64 807 18 732 3" />
        </g>

        <g fill="#6d8565" opacity="0.2">
          <ellipse cx="25" cy="92" rx="8" ry="3" transform="rotate(28 25 92)" />
          <ellipse cx="43" cy="188" rx="8" ry="3" transform="rotate(-34 43 188)" />
          <ellipse cx="62" cy="126" rx="7" ry="2.6" transform="rotate(24 62 126)" />
          <ellipse cx="875" cy="99" rx="8" ry="3" transform="rotate(-28 875 99)" />
          <ellipse cx="852" cy="198" rx="8" ry="3" transform="rotate(31 852 198)" />
          <ellipse cx="833" cy="132" rx="7" ry="2.6" transform="rotate(-22 833 132)" />
          <ellipse cx="118" cy="17" rx="8" ry="3" transform="rotate(-18 118 17)" />
          <ellipse cx="783" cy="19" rx="8" ry="3" transform="rotate(18 783 19)" />
        </g>

        <g fill="#486745" opacity="0.24">
          <ellipse cx="118" cy="126" rx="22" ry="6" transform="rotate(-5 118 126)" />
          <path d="M118 126 L130 119 L126 130 Z" fill="#09140d" />
          <ellipse cx="760" cy="119" rx="25" ry="7" transform="rotate(7 760 119)" />
          <path d="M760 119 L773 111 L769 123 Z" fill="#09140d" />
        </g>
      </svg>
    )
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 600 160"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 z-[1] h-full w-full"
    >
      <g fill="none" stroke="#829b78" strokeLinecap="round" opacity="0.2">
        <path d="M16 -4 C18 24 8 39 18 68" />
        <path d="M35 -5 C35 28 24 47 29 82" />
        <path d="M55 -3 C53 20 47 38 55 60" />
        <path d="M584 -4 C580 20 590 39 580 65" />
        <path d="M563 -4 C565 28 575 46 570 79" />
      </g>
      <g fill="#78936f" opacity="0.16">
        <ellipse cx="18" cy="35" rx="5" ry="2" transform="rotate(-28 18 35)" />
        <ellipse cx="30" cy="58" rx="5" ry="2" transform="rotate(30 30 58)" />
        <ellipse cx="54" cy="38" rx="4" ry="2" transform="rotate(-22 54 38)" />
        <ellipse cx="581" cy="34" rx="5" ry="2" transform="rotate(25 581 34)" />
        <ellipse cx="570" cy="58" rx="5" ry="2" transform="rotate(-30 570 58)" />
      </g>
      <path d="M0 126 C110 117 180 139 290 128 C410 116 490 136 600 123 L600 160 L0 160 Z" fill="#78936f" opacity="0.1" />
      <g fill="#476d43" opacity="0.42">
        <ellipse cx="82" cy="141" rx="17" ry="5" transform="rotate(-7 82 141)" />
        <path d="M82 141 L91 136 L88 144 Z" fill="#09150e" />
        <ellipse cx="500" cy="137" rx="21" ry="7" transform="rotate(8 500 137)" />
        <path d="M500 137 L510 130 L508 140 Z" fill="#09150e" />
        <ellipse cx="548" cy="149" rx="12" ry="4" transform="rotate(-10 548 149)" />
      </g>
      <g fill="#8ea77d" opacity="0.28">
        <path d="M145 137 C151 130 158 133 159 139 C154 142 149 143 145 137 Z" />
        <path d="M427 143 C433 136 440 139 441 145 C435 147 431 148 427 143 Z" />
      </g>
      <g opacity="0.34">
        <g transform="translate(32 143)">
          <circle r="2.4" fill="#b4bf8b" />
          <circle cx="-4" r="2.2" fill="#7d916b" />
          <circle cx="4" r="2.2" fill="#7d916b" />
          <circle cy="-4" r="2.2" fill="#7d916b" />
        </g>
        <g transform="translate(570 139)">
          <circle r="2.2" fill="#b4bf8b" />
          <circle cx="-3.6" r="2" fill="#7d916b" />
          <circle cx="3.6" r="2" fill="#7d916b" />
          <circle cy="-3.6" r="2" fill="#7d916b" />
        </g>
      </g>
    </svg>
  )
}
