// ─────────────────────────────────────────────────────────────────────────────
// POLARIS : Curriculum Seed Data v2
// ─────────────────────────────────────────────────────────────────────────────

export const CURRICULUM_CATEGORIES = [
  { title: 'Career',      accent_color: '#3B82F6', position: 0 },
  { title: 'Academic',    accent_color: '#8B5CF6', position: 1 },
  { title: 'Self',        accent_color: '#10B981', position: 2 },
  { title: 'Media & Lit', accent_color: '#F59E0B', position: 3 },
]

export const SEED_CURRICULA = [
  // ── CAREER ────────────────────────────────────────────────────────────────
  {
    category: 'Career', title: 'PCB Design & Hardware', estimated_hours: 40,
    description: 'From schematic to manufactured board: everything needed for CHAARG and beyond.',
    topics: [
      { title: 'KiCad project setup and library management', estimated_hours: 2, is_recommended_next: true },
      { title: 'Schematic capture: components, nets, power symbols', estimated_hours: 4 },
      { title: 'Footprint assignment and custom footprint creation', estimated_hours: 3 },
      { title: 'PCB layout: placement, routing, design rules', estimated_hours: 6 },
      { title: 'Power path design: switches, protection, LDOs', estimated_hours: 4 },
      { title: 'Thermal management and via arrays', estimated_hours: 3 },
      { title: 'Design for manufacture: tolerances, stackup, DFM checklist', estimated_hours: 3 },
      { title: 'BOM generation and JLCPCB ordering workflow', estimated_hours: 2 },
      { title: 'Design review and documentation for portfolio', estimated_hours: 3 },
    ],
    resources: [
      { title: 'TIDA-010054 reference design', resource_type: 'article' },
      { title: "Phil's Lab YouTube", resource_type: 'video', url: 'https://youtube.com/@PhilsLab' },
      { title: 'Altium Academy free content', resource_type: 'course' },
    ],
  },
  {
    category: 'Career', title: 'Portfolio & Design Thinking', estimated_hours: 25,
    description: 'Building a portfolio that tells engineering stories, not just lists projects.',
    topics: [
      { title: 'What makes a great engineering portfolio: case study structure', estimated_hours: 2, is_recommended_next: true },
      { title: 'Problem -> Process -> Outcome framework', estimated_hours: 2 },
      { title: 'Technical photography and diagram creation', estimated_hours: 3 },
      { title: 'Writing case studies that non-engineers understand', estimated_hours: 3 },
      { title: 'MDX and Astro: building your portfolio site', estimated_hours: 4 },
      { title: 'Design thinking fundamentals: IDEO framework', estimated_hours: 3 },
      { title: 'User research and prototyping basics', estimated_hours: 3 },
      { title: 'Presentation and pitch: communicating your work', estimated_hours: 2 },
    ],
    resources: [
      { title: 'TU Delft IPD portfolio examples', resource_type: 'article' },
      { title: 'IDEO design thinking toolkit', resource_type: 'article' },
      { title: 'Portfolio Showcase Reference', resource_type: 'article' },
    ],
  },
  {
    category: 'Career', title: 'MSc Application Strategy', estimated_hours: 30,
    description: 'Everything from program research to submitted application.',
    topics: [
      { title: 'Mapping programs: fit, requirements, funding', estimated_hours: 3, is_recommended_next: true },
      { title: 'Statement of Purpose: structure and what committees actually read', estimated_hours: 4 },
      { title: 'Writing a research proposal', estimated_hours: 3 },
      { title: 'CV for European MSc applications', estimated_hours: 2 },
      { title: 'Contacting faculty: cold email strategy that works', estimated_hours: 2 },
      { title: 'IELTS preparation: 4-week front-loaded sprint strategy', estimated_hours: 15 },
      { title: 'MOI and document logistics: university specific', estimated_hours: 2 },
      { title: 'Scholarship research and application', estimated_hours: 3 },
      { title: 'Interview preparation', estimated_hours: 2 },
    ],
    resources: [
      { title: 'TU Delft IPD program guide', resource_type: 'article' },
      { title: "Tilman's email guidance", resource_type: 'article' },
      { title: '36-program tracker', resource_type: 'article' },
      { title: 'ielts.org Official Free Practice Tests', resource_type: 'article', url: 'https://www.ielts.org/for-test-takers/sample-test-questions' },
      { title: 'British Council Road to IELTS', resource_type: 'course', url: 'https://takeielts.britishcouncil.org/take-ielts/prepare/free-ielts-practice-tests/road-to-ielts' },
      { title: 'Cambridge IELTS Books 17-19 (Retired Question Banks)', resource_type: 'book' },
      { title: 'IELTS Liz (Writing & Speaking Question Banks)', resource_type: 'article', url: 'https://ieltsliz.com' },
      { title: 'IDP IELTS Prepare App (Computer-Delivered Mock Interface)', resource_type: 'course', url: 'https://ielts.idp.com/prepare/article-idp-ielts-prepare-app' },
    ],
  },
  {
    category: 'Career', title: 'IELTS 2026 Preparation Sprint', estimated_hours: 16,
    description: '4-Week front-loaded weekday-only IELTS preparation plan using 2026 official free resources.',
    topics: [
      { title: 'Week 1 Mon: Diagnostic Mock (Cambridge 19, 45 min)', estimated_hours: 1, is_recommended_next: true },
      { title: 'Week 1 Tue-Fri: Targeted Drilling on Weakest Section (45 min/day)', estimated_hours: 3 },
      { title: 'Week 2 Mon-Fri: Light Drilling - Alternate Reading/Writing & Listening/Speaking (30 min/day)', estimated_hours: 2.5 },
      { title: 'Week 3 Mon-Fri: Maintenance Only - 1 Essay + 1 Speaking Recording + Light Review (25 min/day)', estimated_hours: 2 },
      { title: 'Week 4 Mon-Fri: Full Timed Mock in IDP App + Light Review (20-25 min/day)', estimated_hours: 2 },
      { title: 'IELTS Online Tests: Mock Test 2026 January Listening Test 1', estimated_hours: 1, notes: 'Score: 38/40, Band 8.5. Report: https://ieltsonlinetests.com/score/mock-test-listening-01', status: 'done' },
      { title: 'IELTS Listening Practice Test 201', estimated_hours: 1, notes: 'Score: 38/40, Band 8.5', status: 'done' },
      { title: 'IELTS Reading Practice Test 313', estimated_hours: 1, notes: 'Score: 36/40, Band 8.0. Question Bank: https://practicepteonline.com/official-ielts-tests-book-20/', status: 'done' },
      { title: 'IELTS Reading Practice Test 312', estimated_hours: 1, notes: 'Score: 35/40, Band 8.0. Question Bank: https://practicepteonline.com/official-ielts-tests-book-20/', status: 'done' },
      { title: 'IELTS Reading Practice Test 311', estimated_hours: 1, notes: 'Score: 35/40, Band 8.0. Question Bank: https://practicepteonline.com/official-ielts-tests-book-20/', status: 'done' },
      { title: 'IELTS Reading Practice Test 310', estimated_hours: 1, notes: 'Score: 34/40, Band 7.5. Question Bank: https://practicepteonline.com/official-ielts-tests-book-20/', status: 'done' },
      { title: 'IELTS Academic Writing Practice Test 1 - Task 1 & 2', estimated_hours: 1 },
      { title: 'IELTS Academic Writing Practice Test 2 - Task 1 & 2', estimated_hours: 1 },
      { title: 'IELTS Speaking Practice Test 1 - Parts 1, 2 & 3', estimated_hours: 1 },
      { title: 'Mock Test 2026 January (ieltsonlinetests.com)', estimated_hours: 3 },
      { title: 'Mock Test 2025 December (ieltsonlinetests.com)', estimated_hours: 3 },
      { title: 'Mock Test 2025 November (ieltsonlinetests.com)', estimated_hours: 3 },
      { title: 'Mock Test 2025 October (ieltsonlinetests.com)', estimated_hours: 3 },
    ],
    resources: [
      { title: 'ielts.org Official Free Practice Tests (IELTS Progress Check Sample)', resource_type: 'article', url: 'https://www.ielts.org/for-test-takers/sample-test-questions' },
      { title: 'British Council Road to IELTS (Reading/Listening/Writing Samples)', resource_type: 'course', url: 'https://takeielts.britishcouncil.org/take-ielts/prepare/free-ielts-practice-tests/road-to-ielts' },
      { title: 'Cambridge IELTS Books 17-19 (Official Retired Question Banks)', resource_type: 'book' },
      { title: 'IELTS Liz (Writing Task 2 & Speaking Part 2/3 Banks)', resource_type: 'article', url: 'https://ieltsliz.com' },
      { title: 'IDP IELTS Prepare App (On-screen typing & reading navigation mock)', resource_type: 'course', url: 'https://ielts.idp.com/prepare/article-idp-ielts-prepare-app' },
      { title: 'IELTS Mock Test 2026 January', resource_type: 'course', url: 'https://ieltsonlinetests.com/collection/ielts-mock-test-2026-january' },
      { title: 'IELTS Mock Test 2025 December', resource_type: 'course', url: 'https://ieltsonlinetests.com/collection/ielts-mock-test-2025-december' },
      { title: 'IELTS Mock Test 2025 November', resource_type: 'course', url: 'https://ieltsonlinetests.com/collection/ielts-mock-test-2025-november' },
      { title: 'IELTS Mock Test 2025 October', resource_type: 'course', url: 'https://ieltsonlinetests.com/collection/ielts-mock-test-2025-october' },
      { title: 'IELTS Online Tests Score Report - Mock Jan 2026 Listening Test 1 (Band 8.5)', resource_type: 'article', url: 'https://ieltsonlinetests.com/score/mock-test-listening-01' },
      { title: 'Cambridge IELTS Book 20 Practice Tests', resource_type: 'course', url: 'https://practicepteonline.com/official-ielts-tests-book-20/' },
      { title: 'Cambridge IELTS Book 19 Practice Tests', resource_type: 'course', url: 'https://practicepteonline.com/official-ielts-book-19/' },
      { title: 'Cambridge IELTS Book 18 Practice Tests', resource_type: 'course', url: 'https://practicepteonline.com/official-ielts-tests-book-18/' },
      { title: 'Cambridge IELTS Book 17 Practice Tests', resource_type: 'course', url: 'https://practicepteonline.com/official-ielts-tests-book-17/' },
      { title: 'Cambridge IELTS Book 16 Practice Tests', resource_type: 'course', url: 'https://practicepteonline.com/official-ielts-tests-book-16/' },
    ],
  },
  {
    category: 'Career', title: 'Research & Academic Writing', estimated_hours: 35,
    description: 'From reading papers to publishing them.',
    topics: [
      { title: 'How to read a research paper efficiently', estimated_hours: 2, is_recommended_next: true },
      { title: 'Literature review methodology', estimated_hours: 4 },
      { title: 'Research question formulation', estimated_hours: 2 },
      { title: 'Academic writing style: clarity, precision, hedging', estimated_hours: 3 },
      { title: 'DAB converter control strategies: technical content', estimated_hours: 6 },
      { title: 'IEEE paper structure and formatting', estimated_hours: 3 },
      { title: 'Citation management: Zotero workflow', estimated_hours: 2 },
      { title: 'Peer review process: how it works, how to respond', estimated_hours: 2 },
      { title: 'Submission strategy: journal selection, cover letter', estimated_hours: 2 },
    ],
    resources: [
      { title: 'IEEE Access author guidelines', resource_type: 'article' },
      { title: 'Energies journal', resource_type: 'article' },
      { title: 'Existing DAB literature', resource_type: 'article' },
    ],
  },

  // ── ACADEMIC ──────────────────────────────────────────────────────────────
  {
    category: 'Academic', title: 'Power Electronics: DAB Deep Dive', estimated_hours: 45,
    description: 'Everything beyond what the coursework covers, calibrated for research-level understanding.',
    topics: [
      { title: 'DAB converter fundamentals: topology and operating modes', estimated_hours: 4, is_recommended_next: true },
      { title: 'Single Phase Shift modulation: analysis and limits', estimated_hours: 3 },
      { title: 'Extended Phase Shift and Dual Phase Shift', estimated_hours: 3 },
      { title: 'Triple Active Bridge and multi-port converters', estimated_hours: 3 },
      { title: 'Small signal modeling and control design', estimated_hours: 5 },
      { title: 'MATLAB/Simulink simulation workflow', estimated_hours: 4 },
      { title: 'Thermal modeling for DAB', estimated_hours: 3 },
      { title: 'MPPT algorithms for PV integration', estimated_hours: 3 },
      { title: 'Bidirectional converter applications: V2G, ESS', estimated_hours: 3 },
    ],
    resources: [
      { title: 'Dissertation by Kheraluwala', resource_type: 'book' },
      { title: 'IEEE TPEL papers', resource_type: 'article' },
      { title: 'Faculty advisor research guidance', resource_type: 'article' },
    ],
  },
  {
    category: 'Academic',
    title: 'Embedded Systems & Firmware',
    estimated_hours: 98,
    description: 'A structured, project-driven curriculum for Embedded Software Engineering (SWE), Bare-Metal Firmware, and Embedded Linux synthesizing 4 community-vetted repositories.',
    topics: [
      // Module 1: Embedded C Mastery & Bit Manipulation (11h)
      { title: 'Module 1: Bitwise Operations: Master bit masking, setting, clearing, toggling, and reading specific bits using macro idioms', estimated_hours: 1.5, is_recommended_next: true, module: 1, notes: 'Register bit manipulation macros: SET_BIT, CLEAR_BIT, TOGGLE_BIT, READ_BIT. Source: srnvl/Embedded_SWE_Prep (https://github.com/srnvl/Embedded_SWE_Prep)' },
      { title: 'Module 1: Bitwise Algorithms: Implement Brian Kernighan algorithm to count set bits in C', estimated_hours: 1.0, is_recommended_next: false, module: 1, notes: 'Efficient O(k) set bit counting where k is number of set bits. Source: srnvl/Embedded_SWE_Prep (https://github.com/srnvl/Embedded_SWE_Prep)' },
      { title: 'Module 1: Bitwise Algorithms: Find the only non-repeating number in an array using XOR logic', estimated_hours: 1.0, is_recommended_next: false, module: 1, notes: 'Exploit XOR cancellation properties (x ^ x = 0, x ^ 0 = x) for O(n) time and O(1) space. Source: srnvl/Embedded_SWE_Prep (https://github.com/srnvl/Embedded_SWE_Prep)' },
      { title: 'Module 1: Bitwise Algorithms: Write functions to check power of 2 and reverse bits of 32-bit unsigned integer', estimated_hours: 1.0, is_recommended_next: false, module: 1, notes: 'Master (n & (n - 1)) == 0 check and bit reversal via divide-and-conquer shifts. Source: srnvl/Embedded_SWE_Prep (https://github.com/srnvl/Embedded_SWE_Prep)' },
      { title: 'Module 1: Keywords Deep Dive: Analyze the storage duration, scope, and linkage of static, extern, and register', estimated_hours: 1.5, is_recommended_next: false, module: 1, notes: 'Distinguish internal vs external linkage, file scope vs block scope, and compiler storage implications. Source: theEmbeddedGeorge (https://github.com/theEmbeddedGeorge/theEmbeddedNewTestament)' },
      { title: 'Module 1: Keywords Deep Dive: Master volatile (when to use in memory-mapped I/O, ISR variables, flags)', estimated_hours: 1.5, is_recommended_next: false, module: 1, notes: 'Understand compiler optimization suppression, memory barriers, and volatile pointer declarations. Source: theEmbeddedGeorge (https://github.com/theEmbeddedGeorge/theEmbeddedNewTestament)' },
      { title: 'Module 1: Type Qualifiers: Understand const pointer variants (const int *, int * const, and const int * const)', estimated_hours: 1.0, is_recommended_next: false, module: 1, notes: 'Read clockwise-spiral rule to differentiate pointer to constant data vs constant pointer to mutable data. Source: theEmbeddedGeorge (https://github.com/theEmbeddedGeorge/theEmbeddedNewTestament)' },
      { title: 'Module 1: Memory Layout: Draw and explain the standard C memory layout (Text, Data, BSS, Heap, Stack)', estimated_hours: 1.0, is_recommended_next: false, module: 1, notes: 'Map global initialized variables, zero-initialized BSS, runtime stack frames, and dynamic heap growth. Source: theEmbeddedGeorge (https://github.com/theEmbeddedGeorge/theEmbeddedNewTestament)' },
      { title: 'Module 1: Practical Drill: Complete the Bit Manipulation problem set from srnvl/Embedded_SWE_Prep', estimated_hours: 1.5, is_recommended_next: false, module: 1, notes: 'Solve all practice exercises in bit manipulation section under timed conditions. Source: srnvl/Embedded_SWE_Prep (https://github.com/srnvl/Embedded_SWE_Prep)' },

      // Module 2: Low-Level Memory, Endianness & Struct Architecture (11h)
      { title: 'Module 2: Endianness Detection: Write a C program to detect Big Endian vs Little Endian at runtime using pointers and unions', estimated_hours: 1.0, is_recommended_next: false, module: 2, notes: 'Compare multi-byte union memory representation and char pointer dereferencing of short int 0x0001. Source: srnvl/Embedded_SWE_Prep (https://github.com/srnvl/Embedded_SWE_Prep)' },
      { title: 'Module 2: Endianness Conversion: Write a fast byte-swap macro / function for 16-bit, 32-bit, and 64-bit integers', estimated_hours: 1.0, is_recommended_next: false, module: 2, notes: 'Implement byte-level shifts and compare against compiler builtins __builtin_bswap32 and htons/ntohl. Source: srnvl/Embedded_SWE_Prep (https://github.com/srnvl/Embedded_SWE_Prep)' },
      { title: 'Module 2: Pointer Arithmetic: Master void pointers, function pointers, and arrays of function pointers (jump tables)', estimated_hours: 1.5, is_recommended_next: false, module: 2, notes: 'Build dynamic jump tables for state dispatch and packet handlers. Source: theEmbeddedGeorge (https://github.com/theEmbeddedGeorge/theEmbeddedNewTestament)' },
      { title: 'Module 2: Struct Alignment: Calculate struct sizes with memory padding, alignment rules, and compiler pragma pack / attribute packed', estimated_hours: 1.5, is_recommended_next: false, module: 2, notes: 'Understand CPU word boundary access efficiency, padding penalty, and unaligned access traps. Source: theEmbeddedGeorge (https://github.com/theEmbeddedGeorge/theEmbeddedNewTestament)' },
      { title: 'Module 2: Standard Library Clones: Implement custom memcpy, memmove (handling overlapping memory), and memset', estimated_hours: 2.0, is_recommended_next: false, module: 2, notes: 'Handle source and destination overlap in memmove by backward copying when dest > src. Source: srnvl/Embedded_SWE_Prep (https://github.com/srnvl/Embedded_SWE_Prep)' },
      { title: 'Module 2: String Manipulation in C: Implement my_strstr, my_strcpy, and custom atoi without standard library dependencies', estimated_hours: 1.5, is_recommended_next: false, module: 2, notes: 'Safe zero-dependency string handling, integer overflow checks in atoi, and pointer increments. Source: srnvl/Embedded_SWE_Prep (https://github.com/srnvl/Embedded_SWE_Prep)' },
      { title: 'Module 2: Linked Lists for Embedded: Implement an in-place singly linked list reversal and circular linked list in pure C', estimated_hours: 1.0, is_recommended_next: false, module: 2, notes: 'Master pointer manipulation with 3 pointers (prev, curr, next) and circular buffer link management. Source: srnvl/Embedded_SWE_Prep (https://github.com/srnvl/Embedded_SWE_Prep)' },
      { title: 'Module 2: Practical Drill: Solve Flatten Multi-Level Linked List and Detect Endianness from srnvl/Embedded_SWE_Prep', estimated_hours: 1.5, is_recommended_next: false, module: 2, notes: 'Solve memory and pointer tracking questions from srnvl repository. Source: srnvl/Embedded_SWE_Prep (https://github.com/srnvl/Embedded_SWE_Prep)' },

      // Module 3: Microcontroller Hardware & Communication Protocols (14h)
      { title: 'Module 3: Hardware Fundamentals: Understand open-drain vs push-pull GPIO, pull-up/pull-down resistor calculations, and floating pins', estimated_hours: 1.5, is_recommended_next: false, module: 3, notes: 'Electrical circuit topologies, bus driving, leakage current, and safe pin termination. Source: theEmbeddedGeorge (https://github.com/theEmbeddedGeorge/theEmbeddedNewTestament)' },
      { title: 'Module 3: Analog Interfacing: ADC resolution, sampling rates, sample-and-hold circuits, and DAC basics', estimated_hours: 1.5, is_recommended_next: false, module: 3, notes: 'Quantization error, ENOB (effective number of bits), Nyquist criterion, and SAR vs Sigma-Delta ADCs. Source: theEmbeddedGeorge (https://github.com/theEmbeddedGeorge/theEmbeddedNewTestament)' },
      { title: 'Module 3: Timers & PWM: Clock prescalers, auto-reload registers, capture/compare channels, and PWM duty cycle control', estimated_hours: 1.5, is_recommended_next: false, module: 3, notes: 'Timer peripheral frequency calculations: f_timer = f_clk / ((PSC + 1) * (ARR + 1)). Source: theEmbeddedGeorge (https://github.com/theEmbeddedGeorge/theEmbeddedNewTestament)' },
      { title: 'Module 3: Protocol Deep Dive: UART: Baud rate generation, framing errors, parity, flow control (RTS/CTS), and ring buffer integration', estimated_hours: 1.5, is_recommended_next: false, module: 3, notes: 'Asynchronous serial framing: start bit, 8 data bits, parity, stop bits, and hardware flow control lines. Source: theEmbeddedGeorge (https://github.com/theEmbeddedGeorge/theEmbeddedNewTestament)' },
      { title: 'Module 3: Protocol Deep Dive: SPI: Master-Slave topology, CPOL and CPHA clock polarity modes, Chip Select timings, and DMA transfers', estimated_hours: 1.5, is_recommended_next: false, module: 3, notes: 'Analyze SPI Modes 0, 1, 2, 3 with timing diagrams, clock edge latching, and high-throughput DMA chaining. Source: theEmbeddedGeorge (https://github.com/theEmbeddedGeorge/theEmbeddedNewTestament)' },
      { title: 'Module 3: Protocol Deep Dive: I2C: 7-bit vs 10-bit addressing, Start/Stop conditions, ACK/NACK, clock stretching, and multi-master arbitration', estimated_hours: 1.5, is_recommended_next: false, module: 3, notes: 'Open-drain serial bus with wired-AND logic, bus capacitance limits, pull-up sizing, and collision detection. Source: theEmbeddedGeorge (https://github.com/theEmbeddedGeorge/theEmbeddedNewTestament)' },
      { title: 'Module 3: Protocol Deep Dive: CAN Bus: Differential signaling, CAN frame anatomy, bit stuffing, identifier priority arbitration, and fault confinement', estimated_hours: 2.0, is_recommended_next: false, module: 3, notes: 'Dominant vs recessive bits (CAN_H and CAN_L), 11-bit standard vs 29-bit extended frames, CRC delimiting, and error counters. Source: theEmbeddedGeorge (https://github.com/theEmbeddedGeorge/theEmbeddedNewTestament)' },
      { title: 'Module 3: Interrupt Architecture: ARM Cortex-M NVIC, interrupt vector tables, interrupt priorities, latency, and writing re-entrant ISRs', estimated_hours: 1.5, is_recommended_next: false, module: 3, notes: 'Priority grouping (preemption vs sub-priority), tail-chaining, late arriving interrupts, and ISR re-entrancy rules. Source: theEmbeddedGeorge (https://github.com/theEmbeddedGeorge/theEmbeddedNewTestament)' },
      { title: 'Module 3: Practical Drill: Review George Li Communication Protocols interview summary sheets and notes', estimated_hours: 1.5, is_recommended_next: false, module: 3, notes: 'Study cheat sheets comparing UART vs SPI vs I2C vs CAN electrical and protocol differences. Source: theEmbeddedGeorge (https://github.com/theEmbeddedGeorge/theEmbeddedNewTestament)' },

      // Module 4: Systems Project Track 1: Core Systems in C (14h)
      { title: 'Module 4: Build a Custom Shell: Create a UNIX shell in C with command parsing, fork, execvp, background jobs, and piping', estimated_hours: 4.0, is_recommended_next: false, module: 4, notes: 'Process lifecycle, waitpid, signal handling (SIGINT, SIGTSTP, SIGCHLD), file descriptor redirection with dup2. Source: nCally/Project-Based-Tutorials-in-C (https://github.com/nCally/Project-Based-Tutorials-in-C)' },
      { title: 'Module 4: Build a Memory Allocator: Implement a bare-bones malloc, calloc, and free using sbrk or linked chunk tracking', estimated_hours: 3.5, is_recommended_next: false, module: 4, notes: 'Implement block metadata headers, first-fit or best-fit search, chunk splitting, and coalescing free blocks. Source: nCally/Project-Based-Tutorials-in-C (https://github.com/nCally/Project-Based-Tutorials-in-C)' },
      { title: 'Module 4: Build a Circular Buffer (Ring Buffer): Write a lock-free single-producer single-consumer circular buffer for UART data streaming', estimated_hours: 2.5, is_recommended_next: false, module: 4, notes: 'Modulo vs power-of-two mask indexing, head/tail pointers with atomic barriers, and overrun/underrun handling. Source: nCally/Project-Based-Tutorials-in-C (https://github.com/nCally/Project-Based-Tutorials-in-C)' },
      { title: 'Module 4: Build a Finite State Machine (FSM): Implement a table-driven state machine in C using function pointers for embedded device control', estimated_hours: 2.0, is_recommended_next: false, module: 4, notes: '2D transition matrix next_state = transition_table[current_state][event], state entry/exit actions, and event queues. Source: nCally/Project-Based-Tutorials-in-C (https://github.com/nCally/Project-Based-Tutorials-in-C)' },
      { title: 'Module 4: Code Quality: Run GCC with -Wall -Wextra -Werror -pedantic and verify clean memory with Valgrind / AddressSanitizer', estimated_hours: 2.0, is_recommended_next: false, module: 4, notes: 'Strict compiler flag enforcement, memory leak audits, out-of-bounds checks, and undefined behavior elimination. Source: nCally/Project-Based-Tutorials-in-C (https://github.com/nCally/Project-Based-Tutorials-in-C)' },

      // Module 5: RTOS Fundamentals & Concurrency (11h)
      { title: 'Module 5: RTOS vs Bare-Metal: Superloop architecture vs preemptive scheduling trade-offs', estimated_hours: 1.5, is_recommended_next: false, module: 5, notes: 'Latency determinism, memory footprint overhead, context switch costs, and when a bare-metal state machine is superior. Source: TheEmbeDEADInterview (https://github.com/imsunilvaghela/TheEmbeDEADInterview)' },
      { title: 'Module 5: Scheduling Algorithms: Rate Monotonic Scheduling (RMS), Earliest Deadline First (EDF), and Round Robin', estimated_hours: 1.5, is_recommended_next: false, module: 5, notes: 'Fixed-priority static scheduling bounds: utilization bound U <= n(2^(1/n) - 1) (~69.3%) vs dynamic EDF optimal utilization (100%). Source: theEmbeddedGeorge (https://github.com/theEmbeddedGeorge/theEmbeddedNewTestament)' },
      { title: 'Module 5: Synchronization Primitives: Mutex vs Counting Semaphore vs Binary Semaphore', estimated_hours: 1.5, is_recommended_next: false, module: 5, notes: 'Ownership semantics, recursive locks, signaling between ISR and task, and resource counting. Source: theEmbeddedGeorge (https://github.com/theEmbeddedGeorge/theEmbeddedNewTestament)' },
      { title: 'Module 5: Real-Time Hazards: Priority Inversion, Priority Inheritance, and Deadlock detection (Coffman conditions)', estimated_hours: 1.5, is_recommended_next: false, module: 5, notes: 'Mars Pathfinder incident case study, priority ceiling protocol vs priority inheritance, and breaking circular waits. Source: TheEmbeDEADInterview (https://github.com/imsunilvaghela/TheEmbeDEADInterview)' },
      { title: 'Module 5: Inter-Task Communication: Message queues, event flags, task notifications, and shared memory', estimated_hours: 1.5, is_recommended_next: false, module: 5, notes: 'Pass-by-value vs pass-by-reference in FreeRTOS queues, lightweight direct-to-task notifications (30% faster than semaphores). Source: theEmbeddedGeorge (https://github.com/theEmbeddedGeorge/theEmbeddedNewTestament)' },
      { title: 'Module 5: Critical Sections: Disabling interrupts vs task locking vs spinlocks', estimated_hours: 1.5, is_recommended_next: false, module: 5, notes: 'taskENTER_CRITICAL() / taskEXIT_CRITICAL(), interrupt masking levels in Cortex-M basepri, and multi-core spinlock safety. Source: TheEmbeDEADInterview (https://github.com/imsunilvaghela/TheEmbeDEADInterview)' },
      { title: 'Module 5: FreeRTOS Practice: Create a 2-task FreeRTOS project simulating a sensor reading task and an alert output task', estimated_hours: 2.0, is_recommended_next: false, module: 5, notes: 'Build practical task definitions, priority assignment, queue transmission, and idle hook verification. Source: TheEmbeDEADInterview (https://github.com/imsunilvaghela/TheEmbeDEADInterview)' },

      // Module 6: Embedded Linux, Kernel Internals & Device Drivers (15h)
      { title: 'Module 6: Embedded Linux Architecture: Bootloader (U-Boot), Linux Kernel, Root Filesystem, and Device Tree (.dts/.dtsi)', estimated_hours: 2.0, is_recommended_next: false, module: 6, notes: 'ARM boot sequence: ROM code -> SPL -> U-Boot -> Kernel image + DTB -> init process (systemd/busybox). Source: TheEmbeDEADInterview (https://github.com/imsunilvaghela/TheEmbeDEADInterview)' },
      { title: 'Module 6: Kernel Space vs User Space: Syscalls, virtual memory management, page tables, and context switching overhead', estimated_hours: 2.0, is_recommended_next: false, module: 6, notes: 'MMU page translation, TLB flushes, software interrupt / sysenter entry, user copy routines (copy_to_user, copy_from_user). Source: TheEmbeDEADInterview (https://github.com/imsunilvaghela/TheEmbeDEADInterview)' },
      { title: 'Module 6: Inter-Process Communication (IPC): Pipes, Named FIFOs, POSIX Shared Memory, Message Queues, and UNIX Domain Sockets', estimated_hours: 2.0, is_recommended_next: false, module: 6, notes: 'Performance benchmarks, synchronization with semaphores, zero-copy shared memory vs kernel-buffered sockets. Source: TheEmbeDEADInterview (https://github.com/imsunilvaghela/TheEmbeDEADInterview)' },
      { title: 'Module 6: Linux Kernel Module (LKM): Write, compile, and insert a "Hello World" kernel module using insmod, rmmod, and dmesg', estimated_hours: 2.0, is_recommended_next: false, module: 6, notes: 'Makefile with KDIR, module_init() and module_exit() macros, kernel print levels (pr_info, KERN_ALERT), and module licensing. Source: TheEmbeDEADInterview (https://github.com/imsunilvaghela/TheEmbeDEADInterview)' },
      { title: 'Module 6: Character Device Driver: Build a character driver implementing open(), release(), read(), write(), and ioctl()', estimated_hours: 2.5, is_recommended_next: false, module: 6, notes: 'struct file_operations, major and minor device number allocation (alloc_chrdev_region), cdev initialization, and sysfs device node creation. Source: TheEmbeDEADInterview (https://github.com/imsunilvaghela/TheEmbeDEADInterview)' },
      { title: 'Module 6: Interrupt Handling in Linux: Top half (hard ISR) vs Bottom half (Tasklets, Workqueues, Threaded IRQs)', estimated_hours: 1.5, is_recommended_next: false, module: 6, notes: 'Atomic top-half interrupt service routines vs deferred bottom-half execution in process context (workqueues) vs softirq context. Source: TheEmbeDEADInterview (https://github.com/imsunilvaghela/TheEmbeDEADInterview)' },
      { title: 'Module 6: Build Systems & Cross-Compilation: Configure a cross-compile toolchain (arm-none-eabi-gcc or arm-linux-gnueabihf-gcc)', estimated_hours: 1.5, is_recommended_next: false, module: 6, notes: 'Sysroot configuration, target architecture flags (-mcpu=cortex-a7, -mfloat-abi=hard), and library linking. Source: TheEmbeDEADInterview (https://github.com/imsunilvaghela/TheEmbeDEADInterview)' },
      { title: 'Module 6: Yocto / Buildroot Overview: Understand recipes, layers, bitbake targets, and generating custom minimal Linux images', estimated_hours: 1.5, is_recommended_next: false, module: 6, notes: 'Buildroot vs Yocto architectural comparison, BitBake recipe syntax (do_compile, do_install), machine configuration, and BSP layers. Source: TheEmbeDEADInterview (https://github.com/imsunilvaghela/TheEmbeDEADInterview)' },

      // Module 7: Systems Project Track 2: Capstone Network or Architecture Project (13h)
      { title: 'Module 7: Project Option A (Network Stack): Build a lightweight HTTP/TCP web server in C utilizing socket programming, non-blocking I/O, and epoll()', estimated_hours: 4.0, is_recommended_next: false, module: 7, notes: 'POSIX sockets API (socket, bind, listen, accept), non-blocking flags (O_NONBLOCK), edge-triggered epoll event loops, and HTTP/1.1 parsing. Source: nCally/Project-Based-Tutorials-in-C (https://github.com/nCally/Project-Based-Tutorials-in-C)' },
      { title: 'Module 7: Project Option B (Virtual Machine / Architecture): Build a CHIP-8 or LC-3 virtual computer emulator in C with CPU instruction cycle decoding', estimated_hours: 4.0, is_recommended_next: false, module: 7, notes: 'Fetch-decode-execute cycle, opcode dispatch jump tables, memory registers, keypad input polling, and graphics framebuffers. Source: nCally/Project-Based-Tutorials-in-C (https://github.com/nCally/Project-Based-Tutorials-in-C)' },
      { title: 'Module 7: Project Option C (Key-Value Database): Build a simple persistent B-tree or append-only key-value store in pure C', estimated_hours: 3.0, is_recommended_next: false, module: 7, notes: 'File disk storage formatting, binary serialization, indexing, in-memory cache, and crash recovery log. Source: nCally/Project-Based-Tutorials-in-C (https://github.com/nCally/Project-Based-Tutorials-in-C)' },
      { title: 'Module 7: Testing & Verification: Write unit tests in C (using Unity or CMocka) validating edge cases and memory bounds', estimated_hours: 1.0, is_recommended_next: false, module: 7, notes: 'Automated unit test runner, fixture setup/teardown, mock function injection, and test coverage evaluation. Source: nCally/Project-Based-Tutorials-in-C (https://github.com/nCally/Project-Based-Tutorials-in-C)' },
      { title: 'Module 7: Documentation: Document the architecture, memory footprint, and benchmarks in a GitHub README', estimated_hours: 1.0, is_recommended_next: false, module: 7, notes: 'Memory footprint profiling, throughput benchmarks (requests/second), architectural diagrams, and build instructions. Source: nCally/Project-Based-Tutorials-in-C (https://github.com/nCally/Project-Based-Tutorials-in-C)' },

      // Module 8: Embedded Interview Gauntlet & Technical Drills (9h)
      { title: 'Module 8: Rapid-Fire Drill: Answer 50 standard embedded interview questions from imsunilvaghela/TheEmbeDEADInterview', estimated_hours: 2.0, is_recommended_next: false, module: 8, notes: 'Technical explanations covering bootloaders, compiler stages, static vs dynamic libraries, IPC, and Linux signals. Source: TheEmbeDEADInterview (https://github.com/imsunilvaghela/TheEmbeDEADInterview)' },
      { title: 'Module 8: Circuit & Bus Protocol Interview Defense: Explain SPI vs I2C vs CAN electrical characteristics and troubleshooting steps', estimated_hours: 2.0, is_recommended_next: false, module: 8, notes: 'Oscilloscope and logic analyzer decoding, voltage levels, noise immunity, max cable lengths, and termination resistors (120 ohm CAN). Source: theEmbeddedGeorge (https://github.com/theEmbeddedGeorge/theEmbeddedNewTestament)' },
      { title: 'Module 8: Live Coding Drill: Write a custom byte-level packet parser in C with CRC verification in under 30 minutes', estimated_hours: 1.5, is_recommended_next: false, module: 8, notes: 'Parse serial packet frames: Header, Length, Payload, CRC-16 checksum, and End delimiter with error recovery. Source: srnvl/Embedded_SWE_Prep (https://github.com/srnvl/Embedded_SWE_Prep)' },
      { title: 'Module 8: Debugging Scenario Defense: Walk through resolving a hard fault exception (Bus Fault, Memory Management Fault, Usage Fault)', estimated_hours: 1.5, is_recommended_next: false, module: 8, notes: 'Inspect Cortex-M fault registers (HFSR, CFSR, MMFAR, BFAR), stack frame unwinding on exception entry, and diagnosing null pointer dereferences. Source: theEmbeddedGeorge (https://github.com/theEmbeddedGeorge/theEmbeddedNewTestament)' },
      { title: 'Module 8: Tooling Fluency: Explain how to configure GDB breakpoints, watchpoints, examine registers, and inspect core dumps', estimated_hours: 2.0, is_recommended_next: false, module: 8, notes: 'GDB commands (b, watch *addr, info registers, x/16xw, bt), JTAG/SWD OpenOCD hardware targets, and post-mortem analysis. Source: All 4 Repositories Combined' },
    ],
    resources: [
      {
        title: 'Project-Based Tutorials in C',
        author: 'nCally',
        resource_type: 'course',
        url: 'https://github.com/nCally/Project-Based-Tutorials-in-C',
        notes: 'Hands-on C project tutorials covering Operating Systems, Computer Networking, Databases, and Architecture. Teaches practical C systems programming by building real software from scratch.',
      },
      {
        title: 'theEmbeddedNewTestament',
        author: 'George Li (theEmbeddedGeorge)',
        resource_type: 'article',
        url: 'https://github.com/theEmbeddedGeorge/theEmbeddedNewTestament',
        notes: 'Deep conceptual notes on Hardware Fundamentals, Communication Protocols (I2C, SPI, UART, CAN, USB), Bus Protocols, Debugging (JTAG/SWD/GDB), Interrupts/NVIC, and Microcontroller Architecture. Live site: https://theembeddednewtestament.github.io/',
      },
      {
        title: 'TheEmbeDEADInterview',
        author: 'Sunil Vaghela (imsunilvaghela)',
        resource_type: 'article',
        url: 'https://github.com/imsunilvaghela/TheEmbeDEADInterview',
        notes: 'Technical interview prep specifically geared toward Embedded Linux, Linux Kernel internals, Character/Platform Device Drivers, IPC (Inter-Process Communication), Toolchains, and Yocto Project.',
      },
      {
        title: 'Embedded_SWE_Prep',
        author: 'srnvl',
        resource_type: 'course',
        url: 'https://github.com/srnvl/Embedded_SWE_Prep',
        notes: 'Embedded software coding problems, algorithmic patterns adapted for firmware, bit manipulation tricks, endianness detection, memory alignment, and struct padding.',
      },
    ],
  },
  {
    category: 'Academic', title: 'Python, ML & AI for Engineers', estimated_hours: 50,
    description: 'Practical Python and ML calibrated for robotics, electronics, and research applications.',
    topics: [
      { title: 'Python fundamentals: data structures, functions, OOP', estimated_hours: 5, is_recommended_next: true },
      { title: 'NumPy and Pandas for engineering data', estimated_hours: 4 },
      { title: 'Matplotlib and Plotly: visualizing sensor data', estimated_hours: 3 },
      { title: 'Signal processing with SciPy', estimated_hours: 4 },
      { title: 'Machine learning fundamentals: scikit-learn', estimated_hours: 4 },
      { title: 'Neural networks: PyTorch basics', estimated_hours: 5 },
      { title: 'CNNs for image classification: robotics applications', estimated_hours: 4 },
      { title: 'Time series forecasting: LSTM for power systems', estimated_hours: 4 },
      { title: 'ROS2 fundamentals: nodes, topics, services', estimated_hours: 5 },
      { title: 'Computer vision with OpenCV', estimated_hours: 4 },
    ],
    resources: [
      { title: 'fast.ai', resource_type: 'course', url: 'https://fast.ai' },
      { title: 'Andrej Karpathy lectures', resource_type: 'video' },
      { title: 'ROS2 documentation', resource_type: 'article' },
    ],
  },
  {
    category: 'Academic', title: 'Systems Thinking', estimated_hours: 20,
    description: 'The mental model upgrade that connects everything: engineering, design, ecology, organizations.',
    topics: [
      { title: 'What is a system: stocks, flows, feedback loops', estimated_hours: 2, is_recommended_next: true },
      { title: 'Causal loop diagrams', estimated_hours: 2 },
      { title: 'Leverage points: where to intervene in a system', estimated_hours: 2 },
      { title: 'Resilience, self-organization, hierarchy', estimated_hours: 2 },
      { title: 'Systems thinking in engineering design', estimated_hours: 2 },
      { title: 'Ecological systems and planetary boundaries', estimated_hours: 2 },
      { title: 'Systems thinking in organizations', estimated_hours: 2 },
      { title: 'Applied exercise: map your own life as a system', estimated_hours: 2 },
    ],
    resources: [
      { title: 'Thinking in Systems', author: 'Donella Meadows', resource_type: 'book' },
      { title: 'The Fifth Discipline', author: 'Peter Senge', resource_type: 'book' },
    ],
  },
  {
    category: "Academic",
    title: "Foundational Disciplines: Intellectual Frameworks",
    estimated_hours: 200,
    description: "Synthesizing 8 core foundational disciplines (Philosophy, Economics, Art History, Physics, History, Mathematics, Politics, Linguistics) into a trackable intellectual framework across 63 milestones.",
    topics: [
{
        title: "Track 1: Reading: Read Bertrand Russell's The Problems of Philosophy (Chapters 1 to 5: Appearance and Reality, Matter, and Idealism)",
        description: "Pillar 1: Philosophy (Epistemology)",
        estimated_hours: 3,
        is_recommended_next: true,
        module: 1,
        notes: "Epistemology treatise: Distinguishing appearance from reality, matter, and idealism. Resource: https://www.gutenberg.org/ebooks/5827"
      },
{
        title: "Track 1: Reading: Read Bertrand Russell's The Problems of Philosophy (Chapters 6 to 10: Induction, General Principles, and A Priori Knowledge)",
        description: "Pillar 1: Philosophy (Epistemology)",
        estimated_hours: 3,
        is_recommended_next: false,
        module: 1,
        notes: "Induction, general principles, and a priori knowledge limits. Resource: https://www.gutenberg.org/ebooks/5827"
      },
{
        title: "Track 1: Reading: Read Bertrand Russell's The Problems of Philosophy (Chapters 11 to 15: Intuitive Knowledge, Truth vs. Falsehood, and The Value of Philosophy)",
        description: "Pillar 1: Philosophy (Epistemology)",
        estimated_hours: 3,
        is_recommended_next: false,
        module: 1,
        notes: "Intuitive knowledge, criteria of truth vs falsehood, and the philosophical value. Resource: https://www.gutenberg.org/ebooks/5827"
      },
{
        title: "Track 1: Lecture Series: Watch Yale PHIL 176 Lectures 1-6 (The Nature of Persons, Physicalism vs. Dualism)",
        description: "Pillar 1: Philosophy (Metaphysics of Persons)",
        estimated_hours: 3.5,
        is_recommended_next: false,
        module: 1,
        notes: "Prof. Shelly Kagan: The nature of persons, dualism vs physicalism, and the soul. Resource: https://oyc.yale.edu/philosophy/phil-176"
      },
{
        title: "Track 1: Lecture Series: Watch Yale PHIL 176 Lectures 7-13 (Personal Identity over Time, Bodily vs. Psychological Continuity)",
        description: "Pillar 1: Philosophy (Personal Identity)",
        estimated_hours: 3.5,
        is_recommended_next: false,
        module: 1,
        notes: "Prof. Shelly Kagan: Personal identity over time, bodily vs psychological continuity. Resource: https://oyc.yale.edu/philosophy/phil-176"
      },
{
        title: "Track 1: Lecture Series: Watch Yale PHIL 176 Lectures 14-20 (The Badness of Death, The Deprivation Account, Immortality)",
        description: "Pillar 1: Philosophy (Value of Life)",
        estimated_hours: 3.5,
        is_recommended_next: false,
        module: 1,
        notes: "Prof. Shelly Kagan: Deprivation account of death, why death is bad, and desirability of immortality. Resource: https://oyc.yale.edu/philosophy/phil-176"
      },
{
        title: "Track 1: Lecture Series: Watch Yale PHIL 176 Lectures 21-26 (Suicide, The Value of Life, Living in the Face of Death)",
        description: "Pillar 1: Philosophy (Ethics & Meaning)",
        estimated_hours: 3.5,
        is_recommended_next: false,
        module: 1,
        notes: "Prof. Shelly Kagan: Rationality of suicide, value of life, and living in the face of death. Resource: https://oyc.yale.edu/philosophy/phil-176"
      },
{
        title: "Track 1: Exploration Drill: Search SEP for Epistemology, Personal Identity, and Consequentialism; take synthesis notes",
        description: "Pillar 1: Philosophy (Academic Drill)",
        estimated_hours: 2,
        is_recommended_next: false,
        module: 1,
        notes: "Stanford Encyclopedia of Philosophy: Document 3 core distinctions and arguments. Resource: https://plato.stanford.edu/"
      },
{
        title: "Track 2: Reading: Read The Undercover Economist Part 1 (Who Pays for Your Coffee? Supermarkets and Price Targets)",
        description: "Pillar 2: Economics (Pricing & Rent)",
        estimated_hours: 3,
        is_recommended_next: false,
        module: 2,
        notes: "Tim Harford: Price discrimination, location rents, market power, and supermarket pricing strategies. Resource: https://timharford.com/books/undercovereconomist/"
      },
{
        title: "Track 2: Reading: Read The Undercover Economist Part 2 (Perfect Markets, Inside Information, Key Failures)",
        description: "Pillar 2: Economics (Market Failures)",
        estimated_hours: 3,
        is_recommended_next: false,
        module: 2,
        notes: "Tim Harford: Perfect markets, asymmetric information, adverse selection, and health care failures. Resource: https://timharford.com/books/undercovereconomist/"
      },
{
        title: "Track 2: Reading: Read The Undercover Economist Part 3 (City Traffic, Beer, Global Trade, and Development)",
        description: "Pillar 2: Economics (Externalities & Development)",
        estimated_hours: 3,
        is_recommended_next: false,
        module: 2,
        notes: "Tim Harford: Externalities, congestion pricing, globalization, and why poor countries stay poor. Resource: https://timharford.com/books/undercovereconomist/"
      },
{
        title: "Track 2: Video Modules: Complete MRU Microeconomics Block 1 (Supply, Demand, and Equilibrium Dynamics)",
        description: "Pillar 2: Economics (Equilibrium Theory)",
        estimated_hours: 3.5,
        is_recommended_next: false,
        module: 2,
        notes: "Marginal Revolution University (Cowen & Tabarrok): Incentives, equilibrium price discovery, and shifting curves. Resource: https://mru.org/principles-economics-microeconomics-0"
      },
{
        title: "Track 2: Video Modules: Complete MRU Microeconomics Block 2 (Elasticity, Taxes, Subsidies, and Price Ceilings/Floors)",
        description: "Pillar 2: Economics (Policy & Elasticity)",
        estimated_hours: 3.5,
        is_recommended_next: false,
        module: 2,
        notes: "MRU: Elasticity of demand/supply, tax incidence, deadweight loss, price controls. Resource: https://mru.org/principles-economics-microeconomics-0"
      },
{
        title: "Track 2: Video Modules: Complete MRU Microeconomics Block 3 (Externalities, Public Goods, and Tragedy of the Commons)",
        description: "Pillar 2: Economics (Public Economics)",
        estimated_hours: 3.5,
        is_recommended_next: false,
        module: 2,
        notes: "MRU: Negative/positive externalities, Pigouvian taxes, Coase theorem, public goods. Resource: https://mru.org/principles-economics-microeconomics-0"
      },
{
        title: "Track 2: Video Modules: Complete MRU Microeconomics Block 4 (Competition, Monopoly, and Price Discrimination)",
        description: "Pillar 2: Economics (Market Structures)",
        estimated_hours: 3.5,
        is_recommended_next: false,
        module: 2,
        notes: "MRU: Perfect competition, monopoly rents, natural monopoly, price discrimination degrees. Resource: https://mru.org/principles-economics-microeconomics-0"
      },
{
        title: "Track 2: Interactive Drill: Explore CORE Econ Unit 1 & Unit 2 interactive figures (The Capitalist Revolution and Technological Progress)",
        description: "Pillar 2: Economics (Empirical Modeling)",
        estimated_hours: 2,
        is_recommended_next: false,
        module: 2,
        notes: "CORE Econ: Interactive hockey-stick growth charts, technological progress, and inequality metrics. Resource: https://www.core-econ.org/"
      },
{
        title: "Track 3: Reading: Read E.H. Gombrich's The Story of Art (Introduction on Art & Artists + Ancient Egypt, Greece, and Rome)",
        description: "Pillar 3: Art History (Ancient Civilizations)",
        estimated_hours: 3.5,
        is_recommended_next: false,
        module: 3,
        notes: "Gombrich: Introduction on art and artists, magical function in Egypt, balance in Greece, Roman realism. Resource: https://www.phaidon.com/store/art/the-story-of-art-9780714832470/"
      },
{
        title: "Track 3: Reading: Read E.H. Gombrich's The Story of Art (Early Christian, Byzantine, and Gothic Art)",
        description: "Pillar 3: Art History (Medieval Visual Culture)",
        estimated_hours: 3,
        is_recommended_next: false,
        module: 3,
        notes: "Gombrich: Church art, Byzantine icons, Romanesque stone vaults, Gothic flying buttresses. Resource: https://www.phaidon.com/store/art/the-story-of-art-9780714832470/"
      },
{
        title: "Track 3: Reading: Read E.H. Gombrich's The Story of Art (The Italian Renaissance: Brunelleschi, Donatello, Masaccio, Da Vinci, Michelangelo)",
        description: "Pillar 3: Art History (Italian Renaissance)",
        estimated_hours: 3.5,
        is_recommended_next: false,
        module: 3,
        notes: "Gombrich: Mathematical perspective, naturalism, anatomy, chiaroscuro, High Renaissance masters. Resource: https://www.phaidon.com/store/art/the-story-of-art-9780714832470/"
      },
{
        title: "Track 3: Reading: Read E.H. Gombrich's The Story of Art (Northern Renaissance, Baroque, and Rococo)",
        description: "Pillar 3: Art History (Northern Masters & Baroque)",
        estimated_hours: 3,
        is_recommended_next: false,
        module: 3,
        notes: "Gombrich: Oil painting detail (Van Eyck, Durer), dramatic Caravaggio lighting, Bernini, Dutch Golden Age. Resource: https://www.phaidon.com/store/art/the-story-of-art-9780714832470/"
      },
{
        title: "Track 3: Reading: Read E.H. Gombrich's The Story of Art (19th Century Revolutions: Neoclassicism, Romanticism, and Impressionism)",
        description: "Pillar 3: Art History (19th Century Movements)",
        estimated_hours: 3.5,
        is_recommended_next: false,
        module: 3,
        notes: "Gombrich: Break in tradition, Neoclassical order, Romantic emotion, plein-air Impressionism. Resource: https://www.phaidon.com/store/art/the-story-of-art-9780714832470/"
      },
{
        title: "Track 3: Reading: Read E.H. Gombrich's The Story of Art (20th Century: Cubism, Abstraction, and Contemporary Perspectives)",
        description: "Pillar 3: Art History (Modernist Break)",
        estimated_hours: 3.5,
        is_recommended_next: false,
        module: 3,
        notes: "Gombrich: Cezanne, Van Gogh, Gauguin, Cubist spatial deconstruction, pure abstraction. Resource: https://www.phaidon.com/store/art/the-story-of-art-9780714832470/"
      },
{
        title: "Track 3: Video Series: Watch 10 Smarthistory masterpiece analyses across Renaissance, Dutch Golden Age, and Modernism",
        description: "Pillar 3: Art History (Visual Museum Analysis)",
        estimated_hours: 3,
        is_recommended_next: false,
        module: 3,
        notes: "Dr. Harris & Dr. Zucker: On-site conversational visual analysis of landmark works. Resource: https://smarthistory.org/"
      },
{
        title: "Track 3: Exploration Drill: Tour The Met Online Collection by movement; select 3 artworks and document context",
        description: "Pillar 3: Art History (Curatorial Drill)",
        estimated_hours: 2,
        is_recommended_next: false,
        module: 3,
        notes: "The Met Heilbrunn Timeline: Document patronage, iconography, and historical context for 3 works. Resource: https://www.metmuseum.org/art/collection"
      },
{
        title: "Track 4: Reading: Read Feynman's Six Easy Pieces Chapter 1 (Atoms in Motion: matter, pressure, and thermal motion)",
        description: "Pillar 4: Physics (Atomic Hypothesis)",
        estimated_hours: 2.5,
        is_recommended_next: false,
        module: 4,
        notes: "Richard Feynman: Atomic hypothesis, matter composition, gas pressure, thermal motion. Resource: https://www.feynmanlectures.caltech.edu/"
      },
{
        title: "Track 4: Reading: Read Feynman's Six Easy Pieces Chapter 2 (Basic Physics: fundamental forces and particles)",
        description: "Pillar 4: Physics (Fundamental Interactions)",
        estimated_hours: 2.5,
        is_recommended_next: false,
        module: 4,
        notes: "Richard Feynman: Fundamental interactions (gravitational, electromagnetic, nuclear) and quantum fields. Resource: https://www.feynmanlectures.caltech.edu/"
      },
{
        title: "Track 4: Reading: Read Feynman's Six Easy Pieces Chapter 3 (Physics in Relation to Other Sciences)",
        description: "Pillar 4: Physics (Interdisciplinary Sciences)",
        estimated_hours: 2,
        is_recommended_next: false,
        module: 4,
        notes: "Richard Feynman: Intersections with chemistry, biology, geology, and astronomy. Resource: https://www.feynmanlectures.caltech.edu/"
      },
{
        title: "Track 4: Reading: Read Feynman's Six Easy Pieces Chapter 4 (Conservation of Energy: potential, kinetic, and heat energy)",
        description: "Pillar 4: Physics (Conservation Laws)",
        estimated_hours: 2.5,
        is_recommended_next: false,
        module: 4,
        notes: "Richard Feynman: Abstract nature of energy conservation, gravitational potential, kinetic calculations. Resource: https://www.feynmanlectures.caltech.edu/"
      },
{
        title: "Track 4: Reading: Read Feynman's Six Easy Pieces Chapter 5 (The Theory of Gravitation: Kepler's laws, planetary orbits, and relativity)",
        description: "Pillar 4: Physics (Gravitation & Relativity)",
        estimated_hours: 2.5,
        is_recommended_next: false,
        module: 4,
        notes: "Richard Feynman: Universal gravitation, Kepler laws, planetary mechanics, Einsteinian curved spacetime. Resource: https://www.feynmanlectures.caltech.edu/"
      },
{
        title: "Track 4: Reading: Read Feynman's Six Easy Pieces Chapter 6 (Quantum Behavior: double-slit experiment and probability amplitudes)",
        description: "Pillar 4: Physics (Quantum Foundations)",
        estimated_hours: 3,
        is_recommended_next: false,
        module: 4,
        notes: "Richard Feynman: Wave-particle duality, double-slit experiment, quantum probability amplitudes. Resource: https://www.feynmanlectures.caltech.edu/"
      },
{
        title: "Track 4: Video Series: Watch PBS Space Time playlists on Spacetime Curvature and The Origin of Entropy",
        description: "Pillar 4: Physics (Astrophysics & Relativity)",
        estimated_hours: 3,
        is_recommended_next: false,
        module: 4,
        notes: "Dr. Matt O Dowd: Relativistic spacetime curvature, gravitational singularities, and arrow of time. Resource: https://www.youtube.com/@pbsspacetime"
      },
{
        title: "Track 4: Interactive Lab: Complete 3 PhET simulations (Energy Skate Park, Wave Interference, and Rutherford Scattering)",
        description: "Pillar 4: Physics (Interactive Modeling)",
        estimated_hours: 2,
        is_recommended_next: false,
        module: 4,
        notes: "PhET Boulder: Hands-on interactive modeling of mechanical energy, wave interference, and atomic scattering. Resource: https://phet.colorado.edu/"
      },
{
        title: "Track 5: Reading: Read E.H. Gombrich's A Little History of the World (Chapters 1 to 10: Prehistory to Ancient Greece)",
        description: "Pillar 5: History (Early Civilizations)",
        estimated_hours: 2.5,
        is_recommended_next: false,
        module: 5,
        notes: "Gombrich: Earliest humans, Nile kingdom, Mesopotamia, Jewish history, and ancient Greek polis. Resource: https://yalebooks.yale.edu/book/9780300143324/a-little-history-of-the-world/"
      },
{
        title: "Track 5: Reading: Read E.H. Gombrich's A Little History of the World (Chapters 11 to 20: Alexander, Rome, Christianity, and Germanic Migrations)",
        description: "Pillar 5: History (Antiquity to Migrations)",
        estimated_hours: 2.5,
        is_recommended_next: false,
        module: 5,
        notes: "Gombrich: Hellenistic world, Roman Republic/Empire, early Christianity, and migration era. Resource: https://yalebooks.yale.edu/book/9780300143324/a-little-history-of-the-world/"
      },
{
        title: "Track 5: Reading: Read E.H. Gombrich's A Little History of the World (Chapters 21 to 30: Rise of Islam, Charlemagne, Chivalry, and Renaissance)",
        description: "Pillar 5: History (Medieval Era to Humanism)",
        estimated_hours: 2.5,
        is_recommended_next: false,
        module: 5,
        notes: "Gombrich: Rise of Islam, Carolingian empire, medieval knights, Gutenberg printing, and humanism. Resource: https://yalebooks.yale.edu/book/9780300143324/a-little-history-of-the-world/"
      },
{
        title: "Track 5: Reading: Read E.H. Gombrich's A Little History of the World (Chapters 31 to 40: Exploration, Industrial Age, and the Modern World)",
        description: "Pillar 5: History (Modernity & Global Revolutions)",
        estimated_hours: 2.5,
        is_recommended_next: false,
        module: 5,
        notes: "Gombrich: Voyages of discovery, Enlightenment, French Revolution, Industrialization, and 20th century. Resource: https://yalebooks.yale.edu/book/9780300143324/a-little-history-of-the-world/"
      },
{
        title: "Track 5: Lecture Series: Watch Yale HIST 210 Lectures 1-6 (The Roman Empire Crisis and Constantine)",
        description: "Pillar 5: History (Late Roman Empire)",
        estimated_hours: 3.5,
        is_recommended_next: false,
        module: 5,
        notes: "Prof. Paul Freedman: Third-century crisis, Diocletian reforms, Constantine, Christianization. Resource: https://oyc.yale.edu/history/hist-210"
      },
{
        title: "Track 5: Lecture Series: Watch Yale HIST 210 Lectures 7-12 (Barbarians, Clovis, Monasticism, and Justinian's Byzantium)",
        description: "Pillar 5: History (Post-Roman West & Byzantium)",
        estimated_hours: 3.5,
        is_recommended_next: false,
        module: 5,
        notes: "Prof. Paul Freedman: Germanic kingdoms, Merovingians, monastic culture, Justinian reconquest. Resource: https://oyc.yale.edu/history/hist-210"
      },
{
        title: "Track 5: Lecture Series: Watch Yale HIST 210 Lectures 13-17 (The Rise of Islam, The Umayyads and Abbasids, and Frankish Ascent)",
        description: "Pillar 5: History (Islamic World & Carolingians)",
        estimated_hours: 3.5,
        is_recommended_next: false,
        module: 5,
        notes: "Prof. Paul Freedman: Emergence of Islam, caliphates, Mediterranean economy, rise of the Carolingians. Resource: https://oyc.yale.edu/history/hist-210"
      },
{
        title: "Track 5: Lecture Series: Watch Yale HIST 210 Lectures 18-22 (Charlemagne, Carolingian Crisis, Viking Invasions, Feudal Transformation)",
        description: "Pillar 5: History (Feudal Europe)",
        estimated_hours: 3.5,
        is_recommended_next: false,
        module: 5,
        notes: "Prof. Paul Freedman: Coronation of Charlemagne, disintegration, Viking raids, emergence of feudalism. Resource: https://oyc.yale.edu/history/hist-210"
      },
{
        title: "Track 5: Exploration Drill: Navigate World History Encyclopedia interactive map; track Mediterranean & Silk Road networks (300-1000 CE)",
        description: "Pillar 5: History (Geographic & Trade Drill)",
        estimated_hours: 2,
        is_recommended_next: false,
        module: 5,
        notes: "World History Encyclopedia: Interactive trade maps and primary artifacts between late antiquity and early medieval era. Resource: https://www.worldhistory.org/"
      },
{
        title: "Track 6: Reading: Read Steven Strogatz's The Joy of X (Part 1: Numbers - from counting to complex numbers)",
        description: "Pillar 6: Mathematics (Numbers & Arithmetic)",
        estimated_hours: 3,
        is_recommended_next: false,
        module: 6,
        notes: "Steven Strogatz: Numbers, counting, place value, and journey to imaginary and complex numbers. Resource: https://www.stevenstrogatz.com/books/the-joy-of-x"
      },
{
        title: "Track 6: Reading: Read Steven Strogatz's The Joy of X (Part 2 & 3: Relationships & Shapes - algebra and geometry)",
        description: "Pillar 6: Mathematics (Algebra & Geometry)",
        estimated_hours: 3,
        is_recommended_next: false,
        module: 6,
        notes: "Steven Strogatz: Algebraic relations, balance, triangle geometry, and proof techniques. Resource: https://www.stevenstrogatz.com/books/the-joy-of-x"
      },
{
        title: "Track 6: Reading: Read Steven Strogatz's The Joy of X (Part 4: Change - the foundations of calculus)",
        description: "Pillar 6: Mathematics (Calculus & Rates of Change)",
        estimated_hours: 3,
        is_recommended_next: false,
        module: 6,
        notes: "Steven Strogatz: Rates of change, derivatives, integrals, and the fundamental theorem of calculus. Resource: https://www.stevenstrogatz.com/books/the-joy-of-x"
      },
{
        title: "Track 6: Reading: Read Steven Strogatz's The Joy of X (Part 5 & 6: Data & Frontiers - probability, networks, and infinity)",
        description: "Pillar 6: Mathematics (Probability & Infinity)",
        estimated_hours: 3,
        is_recommended_next: false,
        module: 6,
        notes: "Steven Strogatz: Statistics, conditional probability, small-world networks, and Cantor infinities. Resource: https://www.stevenstrogatz.com/books/the-joy-of-x"
      },
{
        title: "Track 6: Video Series: Watch 3Blue1Brown Essence of Linear Algebra Episodes 1-4 (Vectors, Span, Basis, and Matrix Transformations)",
        description: "Pillar 6: Mathematics (Vector Spaces & Linear Maps)",
        estimated_hours: 3,
        is_recommended_next: false,
        module: 6,
        notes: "Grant Sanderson: Visual geometric intuition for vectors, linear combinations, span, basis, and transformations. Resource: https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab"
      },
{
        title: "Track 6: Video Series: Watch 3Blue1Brown Essence of Linear Algebra Episodes 5-9 (Matrix Multiplication, Determinants, Inverses, and Column Space)",
        description: "Pillar 6: Mathematics (Matrix Operations & Inverses)",
        estimated_hours: 3.5,
        is_recommended_next: false,
        module: 6,
        notes: "Grant Sanderson: Matrix multiplication as composition, determinant scaling factor, inverse matrices, and null spaces. Resource: https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab"
      },
{
        title: "Track 6: Video Series: Watch 3Blue1Brown Essence of Linear Algebra Episodes 10-16 (Dot/Cross Products, Change of Basis, Eigenvectors, and Abstract Vector Spaces)",
        description: "Pillar 6: Mathematics (Eigenvalues & Abstract Spaces)",
        estimated_hours: 3.5,
        is_recommended_next: false,
        module: 6,
        notes: "Grant Sanderson: Geometric duality of dot products, coordinate change, eigenvectors, and eigenvalues. Resource: https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab"
      },
{
        title: "Track 6: Computational Exploration: Solve Project Euler Problems 1, 2, and 3 using pure mathematical insight and clean code",
        description: "Pillar 6: Mathematics (Computational Insights)",
        estimated_hours: 3,
        is_recommended_next: false,
        module: 6,
        notes: "Project Euler: Analytical number theory, multiples of 3 and 5, Fibonacci sums, and prime factors. Resource: https://projecteuler.net/"
      },
{
        title: "Track 7: Reading: Read Michael Sandel's Justice (Chapters 1 to 3: Doing the Right Thing, Utilitarianism, and Libertarianism)",
        description: "Pillar 7: Politics (Utilitarianism vs Individual Rights)",
        estimated_hours: 3.5,
        is_recommended_next: false,
        module: 7,
        notes: "Michael Sandel: Trolley problem, Bentham utilitarian calculus, Mill revision, and Nozick libertarian entitlement. Resource: https://justiceharvard.org/"
      },
{
        title: "Track 7: Reading: Read Michael Sandel's Justice (Chapters 4 to 6: Hired Help, Kant's Motive of Duty, and Rawls' Case for Equality)",
        description: "Pillar 7: Politics (Duty & Distributive Fairness)",
        estimated_hours: 3.5,
        is_recommended_next: false,
        module: 7,
        notes: "Michael Sandel: Military conscription markets, Kant categorical imperative and autonomy, Rawls veil of ignorance. Resource: https://justiceharvard.org/"
      },
{
        title: "Track 7: Reading: Read Michael Sandel's Justice (Chapters 7 to 10: Affirmative Action, Aristotle's Telos, Loyalties, and The Common Good)",
        description: "Pillar 7: Politics (Virtue, Telos & Community)",
        estimated_hours: 3.5,
        is_recommended_next: false,
        module: 7,
        notes: "Michael Sandel: Affirmative action debate, Aristotle teleological justice and honor, obligations of solidarity. Resource: https://justiceharvard.org/"
      },
{
        title: "Track 7: Lecture Series: Watch Harvard Justice Episodes 1-4 (The Moral Side of Murder, The Utilitarian Calculus, Free Markets & Morals)",
        description: "Pillar 7: Politics (Socratic Moral Debates)",
        estimated_hours: 3.5,
        is_recommended_next: false,
        module: 7,
        notes: "Prof. Michael Sandel: Sanders Theatre Socratic debate on moral quandaries and utilitarian trade-offs. Resource: https://www.youtube.com/playlist?list=PL30C13C91CFFEFEA6"
      },
{
        title: "Track 7: Lecture Series: Watch Harvard Justice Episodes 5-8 (Kant on Duty, Rawls on Fairness, Affirmative Action Debate)",
        description: "Pillar 7: Politics (Kant & Rawls In Depth)",
        estimated_hours: 3.5,
        is_recommended_next: false,
        module: 7,
        notes: "Prof. Michael Sandel: Pure reason in ethics, social contract theory, and distributive justice. Resource: https://www.youtube.com/playlist?list=PL30C13C91CFFEFEA6"
      },
{
        title: "Track 7: Lecture Series: Watch Harvard Justice Episodes 9-12 (Aristotle on Purpose, Community Obligations, Debating Same-Sex Marriage and Justice)",
        description: "Pillar 7: Politics (Civic Virtue & Telos)",
        estimated_hours: 3.5,
        is_recommended_next: false,
        module: 7,
        notes: "Prof. Michael Sandel: Flute distribution, telos, moral obligations, and justice in civic society. Resource: https://www.youtube.com/playlist?list=PL30C13C91CFFEFEA6"
      },
{
        title: "Track 7: Deep Dive Exploration: Watch Yale PLSC 114 Lecture 1 (Philosophers and Kings) and Lecture 12 (Hobbes Leviathan); take notes on legitimacy and sovereignty",
        description: "Pillar 7: Politics (Sovereignty & Legitimacy)",
        estimated_hours: 4,
        is_recommended_next: false,
        module: 7,
        notes: "Prof. Steven B. Smith: Western political thought, regime legitimacy, state of nature, and social contracts. Resource: https://oyc.yale.edu/political-science/plsc-114"
      },
{
        title: "Track 8: Reading: Read Steven Pinker's The Language Instinct (Chapters 1 to 4: An Instinct to Acquire an Art, Chatterboxes, Mentalese, How Language Works)",
        description: "Pillar 8: Linguistics (Language as Biology)",
        estimated_hours: 3.5,
        is_recommended_next: false,
        module: 8,
        notes: "Steven Pinker: Refuting linguistic determinism, mentalese representation, and discrete combinatorial systems. Resource: https://stevenpinker.com/publications/language-instinct"
      },
{
        title: "Track 8: Reading: Read Steven Pinker's The Language Instinct (Chapters 5 to 8: Words, The Sounds of Silence, Talking Heads, The Tower of Babel)",
        description: "Pillar 8: Linguistics (Phonology & Syntax Engine)",
        estimated_hours: 3.5,
        is_recommended_next: false,
        module: 8,
        notes: "Steven Pinker: Morphology, coarticulation acoustic waves, phrase trees, and language family trees. Resource: https://stevenpinker.com/publications/language-instinct"
      },
{
        title: "Track 8: Reading: Read Steven Pinker's The Language Instinct (Chapters 9 to 13: Baby Born Talking, Language Organs, Evolution of Speech, The Mind's Eye)",
        description: "Pillar 8: Linguistics (Acquisition & Evolution)",
        estimated_hours: 3.5,
        is_recommended_next: false,
        module: 8,
        notes: "Steven Pinker: Child grammar acquisition, Broca and Wernicke aphasias, Darwinian selection of speech. Resource: https://stevenpinker.com/publications/language-instinct"
      },
{
        title: "Track 8: Video Series: Watch Crash Course Linguistics Episodes 1-5 (What is Linguistics, Morphology, Lexicons, Syntax, and Semantics)",
        description: "Pillar 8: Linguistics (Grammar & Meaning Engines)",
        estimated_hours: 3.5,
        is_recommended_next: false,
        module: 8,
        notes: "Taylor Behnke: Morphemes, lexical categories, constituency parse trees, and semantic truth conditions. Resource: https://www.youtube.com/playlist?list=PL8dPuuaLjXtP5-b_u6y-neKqXk5c2KkH9"
      },
{
        title: "Track 8: Video Series: Watch Crash Course Linguistics Episodes 6-10 (Pragmatics, Sociolinguistics, Phonetics Consonants/Vowels, and Phonology)",
        description: "Pillar 8: Linguistics (Sounds & Social Dynamics)",
        estimated_hours: 3.5,
        is_recommended_next: false,
        module: 8,
        notes: "Taylor Behnke: Gricean maxims, dialect variation, International Phonetic Alphabet, and phonemes. Resource: https://www.youtube.com/playlist?list=PL8dPuuaLjXtP5-b_u6y-neKqXk5c2KkH9"
      },
{
        title: "Track 8: Video Series: Watch Crash Course Linguistics Episodes 11-16 (Psycholinguistics, Language Acquisition, Language Change, World Languages, Computational Linguistics, and Writing Systems)",
        description: "Pillar 8: Linguistics (Typology & Computation)",
        estimated_hours: 4,
        is_recommended_next: false,
        module: 8,
        notes: "Taylor Behnke: Critical period hypothesis, sound shift laws, language revival, and natural language processing. Resource: https://www.youtube.com/playlist?list=PL8dPuuaLjXtP5-b_u6y-neKqXk5c2KkH9"
      },
{
        title: "Track 8: Linguistic Mapping Drill: Open WALS and explore Feature 81A (Order of Subject, Object, and Verb); analyze geographic distribution",
        description: "Pillar 8: Linguistics (Typological Mapping Drill)",
        estimated_hours: 3.5,
        is_recommended_next: false,
        module: 8,
        notes: "WALS: World Atlas of Language Structures comparative analysis of SOV vs SVO word orders across Eurasia and South Asia. Resource: https://wals.info/"
      }
    ],
    resources: [
{
        title: "The Problems of Philosophy",
        author: "Bertrand Russell",
        resource_type: "book",
        url: "https://www.gutenberg.org/ebooks/5827",
        notes: "Free open-access edition on Project Gutenberg. Epistemology, appearance vs reality, and induction."
      },
{
        title: "Death (Yale PHIL 176)",
        author: "Prof. Shelly Kagan",
        resource_type: "course",
        url: "https://oyc.yale.edu/philosophy/phil-176",
        notes: "26 lectures examining mortality, personal identity, dualism vs physicalism, and the value of life."
      },
{
        title: "Stanford Encyclopedia of Philosophy",
        author: "Stanford University",
        resource_type: "article",
        url: "https://plato.stanford.edu/",
        notes: "Peer-reviewed academic reference for precise definitions, bibliographies, and philosophical analysis."
      },
{
        title: "The Undercover Economist",
        author: "Tim Harford",
        resource_type: "book",
        url: "https://timharford.com/books/undercovereconomist/",
        notes: "Explains economic forces shaping modern life: price discrimination, market power, and development."
      },
{
        title: "Principles of Economics: Microeconomics",
        author: "Marginal Revolution University",
        resource_type: "course",
        url: "https://mru.org/principles-economics-microeconomics-0",
        notes: "Modular video series covering incentives, supply/demand, price controls, elasticity, and externalities."
      },
{
        title: "CORE Econ Online Textbooks",
        author: "CORE Econ Team",
        resource_type: "course",
        url: "https://www.core-econ.org/",
        notes: "Interactive open-access economics textbooks grounding theory in empirical data and history."
      },
{
        title: "The Story of Art",
        author: "E.H. Gombrich",
        resource_type: "book",
        url: "https://www.phaidon.com/store/art/the-story-of-art-9780714832470/",
        notes: "Chronological visual journey from ancient civilizations through Renaissance to 20th century."
      },
{
        title: "Smarthistory",
        author: "Dr. Beth Harris & Dr. Steven Zucker",
        resource_type: "video",
        url: "https://smarthistory.org/",
        notes: "Conversational visual analysis of masterworks filmed on-site in world museums and cultural landmarks."
      },
{
        title: "The Met Collection & Heilbrunn Timeline",
        author: "The Metropolitan Museum of Art",
        resource_type: "article",
        url: "https://www.metmuseum.org/art/collection",
        notes: "490,000+ digitized masterworks with curatorial essays and global chronological timelines."
      },
{
        title: "Six Easy Pieces",
        author: "Richard Feynman",
        resource_type: "book",
        url: "https://www.feynmanlectures.caltech.edu/",
        notes: "Foundational physics explained by its most brilliant teacher: atoms, gravity, energy, quantum behavior."
      },
{
        title: "PBS Space Time",
        author: "Dr. Matt O'Dowd",
        resource_type: "video",
        url: "https://www.youtube.com/@pbsspacetime",
        notes: "High-production exploration of general relativity, quantum paradoxes, black holes, and entropy."
      },
{
        title: "PhET Interactive Simulations",
        author: "University of Colorado Boulder",
        resource_type: "course",
        url: "https://phet.colorado.edu/",
        notes: "Interactive simulations modeling mechanics, circuits, energy conservation, and wave interference."
      },
{
        title: "A Little History of the World",
        author: "E.H. Gombrich",
        resource_type: "book",
        url: "https://yalebooks.yale.edu/book/9780300143324/a-little-history-of-the-world/",
        notes: "Lucid chronological narrative of human civilization across all historical eras."
      },
{
        title: "The Early Middle Ages, 284-1000 (Yale HIST 210)",
        author: "Prof. Paul Freedman",
        resource_type: "course",
        url: "https://oyc.yale.edu/history/hist-210",
        notes: "22 full lectures on late Roman transition, Byzantium, early Islam, Charlemagne, and feudalism."
      },
{
        title: "World History Encyclopedia",
        author: "World History Encyclopedia",
        resource_type: "article",
        url: "https://www.worldhistory.org/",
        notes: "Peer-reviewed history articles, interactive timelines, and primary maps of antiquity and trade routes."
      },
{
        title: "The Joy of X",
        author: "Steven Strogatz",
        resource_type: "book",
        url: "https://www.stevenstrogatz.com/books/the-joy-of-x",
        notes: "Intuitive journey through numbers, geometry, calculus, and infinity."
      },
{
        title: "Essence of Linear Algebra",
        author: "Grant Sanderson (3Blue1Brown)",
        resource_type: "video",
        url: "https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab",
        notes: "Geometric and visual intuition for vectors, matrices, and transformations."
      },
{
        title: "Project Euler",
        author: "Project Euler Team",
        resource_type: "course",
        url: "https://projecteuler.net/",
        notes: "Challenging mathematical and algorithmic problem-solving puzzles requiring deep insight."
      },
{
        title: "Justice: What's the Right Thing to Do?",
        author: "Prof. Michael J. Sandel",
        resource_type: "book",
        url: "https://justiceharvard.org/",
        notes: "Moral dilemmas, utilitarianism, Kantian duty, and theories of justice."
      },
{
        title: "Harvard Justice Lecture Series",
        author: "Prof. Michael Sandel",
        resource_type: "course",
        url: "https://www.youtube.com/playlist?list=PL30C13C91CFFEFEA6",
        notes: "Famous 12-episode filmed course on civic virtue and moral reasoning."
      },
{
        title: "Introduction to Political Philosophy (PLSC 114)",
        author: "Prof. Steven B. Smith (Yale University)",
        resource_type: "course",
        url: "https://oyc.yale.edu/political-science/plsc-114",
        notes: "Comprehensive study of Plato, Aristotle, Machiavelli, Hobbes, and Locke."
      },
{
        title: "The Language Instinct",
        author: "Prof. Steven Pinker",
        resource_type: "book",
        url: "https://stevenpinker.com/publications/language-instinct",
        notes: "Language as a biological adaptation, universal grammar, and cognition."
      },
{
        title: "Crash Course Linguistics",
        author: "Taylor Behnke / CrashCourse",
        resource_type: "video",
        url: "https://www.youtube.com/playlist?list=PL8dPuuaLjXtP5-b_u6y-neKqXk5c2KkH9",
        notes: "16-episode overview of morphology, syntax, phonetics, and sociolinguistics."
      },
{
        title: "World Atlas of Language Structures (WALS)",
        author: "Max Planck Institute",
        resource_type: "article",
        url: "https://wals.info/",
        notes: "Global comparative database of structural linguistic properties across 2,500+ languages."
      }
    ]
  },
  {
    category: "Career",
    title: "Applied Skills: Engineering, Security, Design & Rhetoric",
    estimated_hours: 68,
    description: "Practical engineering, cybersecurity, rhetorical writing, and industrial design sketching across 4 applied tracks and 28 discrete milestones.",
    topics: [
      // Track A: Electrical Engineering & Digital Logic Mastery (8 tasks, 24h)
      {
        title: "Track A: Digital Logic: Build a 555-timer astable multivibrator clock module with manual stepping",
        description: "Pillar A: Digital Logic & Hardware (Clock Generation)",
        estimated_hours: 3.0,
        is_recommended_next: true,
        module: 1,
        notes: "555-timer astable multivibrator clock module with manual single-stepping. Ben Eater 8-bit computer project: https://eater.net/8bit/clock"
      },
      {
        title: "Track A: Computer Registers: Wire up 4-bit and 8-bit registers using 74LS173 D-flip-flops",
        description: "Pillar A: Digital Logic & Hardware (Registers & Data Latching)",
        estimated_hours: 3.0,
        is_recommended_next: false,
        module: 1,
        notes: "4-bit and 8-bit registers using 74LS173 D-type flip-flops. Ben Eater: https://eater.net/8bit/registers"
      },
      {
        title: "Track A: ALU Design: Build an 8-bit adder/subtractor with 74LS283 adders and 74LS86 XOR gates",
        description: "Pillar A: Digital Logic & Hardware (Arithmetic Logic Unit)",
        estimated_hours: 3.0,
        is_recommended_next: false,
        module: 1,
        notes: "8-bit binary adder and subtractor using 74LS283 4-bit binary adders and 74LS86 XOR gates. Ben Eater: https://eater.net/8bit/alu"
      },
      {
        title: "Track A: Memory Systems: Wire up 16-byte RAM using 74LS189 with memory address register (MAR)",
        description: "Pillar A: Digital Logic & Hardware (SRAM & Address Bus)",
        estimated_hours: 3.0,
        is_recommended_next: false,
        module: 1,
        notes: "16-byte random access memory using 74LS189 SRAM with 74LS173 MAR. Ben Eater: https://eater.net/8bit/ram"
      },
      {
        title: "Track A: Control Logic: Build EEPROM microcode instruction decoder and program counter",
        description: "Pillar A: Digital Logic & Hardware (Microcode & Sequencing)",
        estimated_hours: 3.0,
        is_recommended_next: false,
        module: 1,
        notes: "Control logic microcode decoder with AT28C16 EEPROMs and 74LS161 program counter. Ben Eater: https://eater.net/8bit/control-logic"
      },
      {
        title: "Track A: Program Execution: Write and execute a Fibonacci program in machine code on the breadboard",
        description: "Pillar A: Digital Logic & Hardware (Machine Code Execution)",
        estimated_hours: 3.0,
        is_recommended_next: false,
        module: 1,
        notes: "Hand-assembled machine code to compute Fibonacci sequence on breadboard CPU. Ben Eater: https://eater.net/8bit/"
      },
      {
        title: "Track A: Component Physics: Watch The Engineering Mindset on MOSFETs, BJTs, and PN junction diodes",
        description: "Pillar A: Digital Logic & Hardware (Semiconductor Physics)",
        estimated_hours: 3.0,
        is_recommended_next: false,
        module: 1,
        notes: "Transistor physics, PN junctions, depletion zones, enhancement MOSFETs, and switching circuits. The Engineering Mindset: https://www.youtube.com/playlist?list=PLWv9VM947MKi_7yJ0_FCbzPVTDU2VwnEx"
      },
      {
        title: "Track A: Math Derivations: Transcribe 3 complex circuit theorems into Derive Notes for error checking",
        description: "Pillar A: Digital Logic & Hardware (Analytical Derivations)",
        estimated_hours: 3.0,
        is_recommended_next: false,
        module: 1,
        notes: "Thevenin, Norton, and Superposition network analysis theorem derivations transcribed in Derive Notes: https://derivenotes.com/"
      },

      // Track B: Hands-On Cybersecurity & Systems Defense (7 tasks, 18h)
      {
        title: "Track B: Kali Linux Environment: Set up Kali Linux VM and master essential terminal navigation and permissions",
        description: "Pillar B: Cybersecurity & Systems Defense (Linux Operations)",
        estimated_hours: 2.5,
        is_recommended_next: false,
        module: 2,
        notes: "Kali Linux installation, bash terminal navigation, chmod, chown, sudo, package managers. freeCodeCamp / Cyber Mentor: https://www.youtube.com/watch?v=lZAoFs75_cs"
      },
      {
        title: "Track B: Network Discovery: Execute target host discovery and port scanning with Nmap flags (-sV, -sC, -A)",
        description: "Pillar B: Cybersecurity & Systems Defense (Reconnaissance)",
        estimated_hours: 2.5,
        is_recommended_next: false,
        module: 2,
        notes: "Nmap active discovery, service version detection, default NSE scripts, OS fingerprinting. freeCodeCamp: https://www.youtube.com/watch?v=lZAoFs75_cs"
      },
      {
        title: "Track B: Packet Capture: Configure Wireshark packet capture filters and capture a live TCP 3-way handshake",
        description: "Pillar B: Cybersecurity & Systems Defense (Packet Inspection)",
        estimated_hours: 2.5,
        is_recommended_next: false,
        module: 2,
        notes: "Wireshark Berkeley packet filters, capture interfaces, SYN-SYN/ACK-ACK handshake analysis. Hacker Joe: https://www.youtube.com/watch?v=lb1Dw0elw0Q"
      },
      {
        title: "Track B: Protocol Analysis: Inspect unencrypted HTTP GET/POST requests and DNS queries in Wireshark",
        description: "Pillar B: Cybersecurity & Systems Defense (Traffic Analysis)",
        estimated_hours: 2.5,
        is_recommended_next: false,
        module: 2,
        notes: "Dissecting application layer payloads, cleartext credentials, DNS resolution frames in Wireshark. Hacker Joe: https://www.youtube.com/watch?v=lb1Dw0elw0Q"
      },
      {
        title: "Track B: Web Enumeration: Run Dirb dictionary fuzzing against a local test web server",
        description: "Pillar B: Cybersecurity & Systems Defense (Web Enumeration)",
        estimated_hours: 2.5,
        is_recommended_next: false,
        module: 2,
        notes: "Web application directory busting and wordlist fuzzing against local test endpoint. Reference: https://www.youtube.com/results?search_query=What+a+Real+Attack+Looks+Like+in+Wireshark+Nmap+Dirb"
      },
      {
        title: "Track B: Attack Chaining Analysis: Correlate Nmap scans and Dirb enumeration inside Wireshark packet logs",
        description: "Pillar B: Cybersecurity & Systems Defense (Forensics & Attack Chaining)",
        estimated_hours: 3.0,
        is_recommended_next: false,
        module: 2,
        notes: "Correlating port scan signatures and directory fuzzing spikes within Wireshark pcap traces. Reference: https://www.youtube.com/results?search_query=What+a+Real+Attack+Looks+Like+in+Wireshark+Nmap+Dirb"
      },
      {
        title: "Track B: Security Roadmap Alignment: Review roadmap.sh/cyber-security and map personal systems security goals",
        description: "Pillar B: Cybersecurity & Systems Defense (Curriculum Alignment)",
        estimated_hours: 2.5,
        is_recommended_next: false,
        module: 2,
        notes: "Synthesizing defensive domains, networking basics, system hardening, and certification milestones. Roadmap: https://roadmap.sh/cyber-security"
      },

      // Track C: Persuasive Rhetoric & Narrative Writing (6 tasks, 18h)
      {
        title: "Track C: Classical Rhetoric: Complete Harvard Rhetoric Unit 1 (Ethos, Pathos, and Logos in Argumentation)",
        description: "Pillar C: Persuasive Rhetoric & Writing (Appeals & Proofs)",
        estimated_hours: 3.0,
        is_recommended_next: false,
        module: 3,
        notes: "Aristotelian rhetorical appeals: establishing credibility (ethos), emotional resonance (pathos), deductive reasoning (logos). Harvard PLL: https://pll.harvard.edu/course/rhetoric-art-persuasive-writing-and-public-speaking"
      },
      {
        title: "Track C: Speech & Essay Structure: Complete Harvard Rhetoric Unit 2 (Ciceronian arrangement and rhetorical tropes)",
        description: "Pillar C: Persuasive Rhetoric & Writing (Arrangement & Style)",
        estimated_hours: 3.0,
        is_recommended_next: false,
        module: 3,
        notes: "Classical six-part rhetorical structure (exordium, narratio, partitio, confirmatio, refutatio, peroratio) and stylistic figures. Harvard PLL: https://pll.harvard.edu/course/rhetoric-art-persuasive-writing-and-public-speaking"
      },
      {
        title: "Track C: Critical Reading: Complete Open University Creative Writing Unit on reading like a writer",
        description: "Pillar C: Persuasive Rhetoric & Writing (Critical Reading)",
        estimated_hours: 3.0,
        is_recommended_next: false,
        module: 3,
        notes: "Dissecting authorial craft, subtext, syntactic rhythm, and narrative pacing. OpenLearn: https://www.open.edu/openlearn/history-the-arts/creative-writing-and-critical-reading"
      },
      {
        title: "Track C: Fiction Fundamentals: Complete Open University Start Writing Fiction Unit (Character development and voice)",
        description: "Pillar C: Persuasive Rhetoric & Writing (Character & Voice)",
        estimated_hours: 3.0,
        is_recommended_next: false,
        module: 3,
        notes: "Crafting three-dimensional characters, distinct dialogue registers, and psychological agency. OpenLearn: https://www.open.edu/openlearn/history-the-arts/creative-writing/start-writing-fiction/content-section-0"
      },
      {
        title: "Track C: Narrative World-Building: Complete Open University Start Writing Fiction Unit (Setting and conflict arcs)",
        description: "Pillar C: Persuasive Rhetoric & Writing (Setting & Tension)",
        estimated_hours: 3.0,
        is_recommended_next: false,
        module: 3,
        notes: "Sensory grounding, atmosphere, rising action, climax, and conflict resolution arcs. OpenLearn: https://www.open.edu/openlearn/history-the-arts/creative-writing/start-writing-fiction/content-section-0"
      },
      {
        title: "Track C: Memory to Prose: Complete Open University Writing What You Know (Channeling lived experience into personal essays)",
        description: "Pillar C: Persuasive Rhetoric & Writing (Essay & SOP Framing)",
        estimated_hours: 3.0,
        is_recommended_next: false,
        module: 3,
        notes: "Translating subjective memory and lived experience into structured personal essays and SOP narratives. OpenLearn: https://www.open.edu/openlearn/history-the-arts/creative-writing"
      },

      // Track D: Industrial Product Design (IPD) 7-Day Rapid Sketching Intensive (7 tasks, 8h)
      {
        title: "Track D: Day 1: Line Confidence & Shoulder Motion (Straight lines, smooth ellipses without wrist-flicking)",
        description: "Pillar D: Product Design Sketching (Linework Warmup)",
        estimated_hours: 1.0,
        is_recommended_next: false,
        module: 4,
        notes: "Warmup drills: drawing from the shoulder, ghosting lines, continuous ellipse trains, pressure control. Jackie Create: https://www.youtube.com/@jackiecreate"
      },
      {
        title: "Track D: Day 2: 1-Point and 2-Point Perspective Grids (Constructing primitive volumetric boxes with correct convergence)",
        description: "Pillar D: Product Design Sketching (Perspective Grids)",
        estimated_hours: 1.0,
        is_recommended_next: false,
        module: 4,
        notes: "Horizon lines, vanishing points, constructing 3D bounding boxes without distortion. Jackie Create: https://www.youtube.com/@jackiecreate"
      },
      {
        title: "Track D: Day 3: Volumetric Carving (Cutting into boxes, creating chamfers, fillets, and rounded corners)",
        description: "Pillar D: Product Design Sketching (Mass Subtraction)",
        estimated_hours: 1.0,
        is_recommended_next: false,
        module: 4,
        notes: "Subtracting mass from perspective boxes, drafting planar chamfers, and tangent fillets. Jackie Create: https://www.youtube.com/@jackiecreate"
      },
      {
        title: "Track D: Day 4: Cylinders and Radii (Drawing ellipses in perspective across multiple planes)",
        description: "Pillar D: Product Design Sketching (Rotational Form)",
        estimated_hours: 1.0,
        is_recommended_next: false,
        module: 4,
        notes: "Minor and major axis alignment, cylindrical extrusions, drawing knobs and buttons on angled planes. Jackie Create: https://www.youtube.com/@jackiecreate"
      },
      {
        title: "Track D: Day 5: Line Weight Hierarchy (Distinguishing light construction guidelines from bold profile silhouette cuts)",
        description: "Pillar D: Product Design Sketching (Lineweight Hierarchy)",
        estimated_hours: 1.0,
        is_recommended_next: false,
        module: 4,
        notes: "3-tier lineweight: construction spiderwebs, parting lines, and bold external silhouette cutlines. Jackie Create: https://www.youtube.com/@jackiecreate"
      },
      {
        title: "Track D: Day 6: Light, Shadow & Shading (Applying single-source directional shading to communicate form curvature)",
        description: "Pillar D: Product Design Sketching (Form Shading)",
        estimated_hours: 1.0,
        is_recommended_next: false,
        module: 4,
        notes: "Key light source placement, core shadows, cast shadows, and surface gradient hatching. Jackie Create: https://www.youtube.com/@jackiecreate"
      },
      {
        title: "Track D: Day 7: Complete Product Concept Page (Sketch an ergonomic handheld electronics tool with exploded callouts)",
        description: "Pillar D: Product Design Sketching (Concept Hero Page)",
        estimated_hours: 2.0,
        is_recommended_next: false,
        module: 4,
        notes: "Hero perspective view, parting lines, user touchpoints, grip texture, and exploded component callouts. Jackie Create: https://www.youtube.com/@jackiecreate"
      }
    ],
    resources: [
      {
        title: "Building an 8-bit computer from scratch (YouTube Playlist)",
        author: "Ben Eater",
        resource_type: "video",
        url: "https://www.youtube.com/playlist?list=PLowKtXNTBypGqImEexZ58KShH-z86Zq07",
        notes: "Legendary hardware video series building a fully functional breadboard computer from individual 7400-series ICs."
      },
      {
        title: "8-Bit Breadboard Computer Documentation & Schematics",
        author: "Ben Eater",
        resource_type: "website",
        url: "https://eater.net/8bit/",
        notes: "Complete circuit schematics, module breakdowns, microcode tables, and assembly programming instructions."
      },
      {
        title: "Electronics Explained (YouTube Playlist)",
        author: "The Engineering Mindset",
        resource_type: "video",
        url: "https://www.youtube.com/playlist?list=PLWv9VM947MKi_7yJ0_FCbzPVTDU2VwnEx",
        notes: "Visual animations explaining MOSFETs, BJTs, diodes, capacitors, and power semiconductor fundamentals."
      },
      {
        title: "Derive Notes: Math & Circuit Derivations",
        author: "Derive Notes Team",
        resource_type: "website",
        url: "https://derivenotes.com/",
        notes: "Interactive derivations and verification platform for circuit theorems, Laplace transforms, and complex math."
      },
      {
        title: "Linux for Ethical Hackers Course",
        author: "freeCodeCamp / The Cyber Mentor (Heath Adams)",
        resource_type: "video",
        url: "https://www.youtube.com/watch?v=lZAoFs75_cs",
        notes: "Comprehensive terminal navigation, user privilege escalation, file permissions, and ethical hacking fundamentals in Linux."
      },
      {
        title: "Mastering Wireshark Tutorial",
        author: "Hacker Joe / freeCodeCamp",
        resource_type: "video",
        url: "https://www.youtube.com/watch?v=lb1Dw0elw0Q",
        notes: "Deep-dive Wireshark packet capture, display filters, protocol analysis, and stream reassembly."
      },
      {
        title: "Real Attack Breakdown in Wireshark (Attack Chaining Lab)",
        author: "Cyber Security Labs",
        resource_type: "video",
        url: "https://www.youtube.com/results?search_query=What+a+Real+Attack+Looks+Like+in+Wireshark+Nmap+Dirb",
        notes: "Step-by-step trace analysis correlating Nmap port sweeps and Dirb web directory fuzzing inside pcap logs."
      },
      {
        title: "Roadmap.sh: Cybersecurity Career & Skills Path",
        author: "roadmap.sh Community",
        resource_type: "website",
        url: "https://roadmap.sh/cyber-security",
        notes: "Comprehensive modern guide to defensive security, network protocols, threat modeling, and infrastructure protection."
      },
      {
        title: "Rhetoric: The Art of Persuasive Writing and Public Speaking",
        author: "Harvard University (Prof. James Engell)",
        resource_type: "course",
        url: "https://pll.harvard.edu/course/rhetoric-art-persuasive-writing-and-public-speaking",
        notes: "Classical rhetorical appeals (ethos, pathos, logos), argument structure, and Ciceronian speech organization."
      },
      {
        title: "Creative Writing and Critical Reading",
        author: "The Open University",
        resource_type: "course",
        url: "https://www.open.edu/openlearn/history-the-arts/creative-writing-and-critical-reading",
        notes: "OpenLearn course on analyzing authorial craft, subtext, characterization, and narrative prose."
      },
      {
        title: "Start Writing Fiction",
        author: "The Open University",
        resource_type: "course",
        url: "https://www.open.edu/openlearn/history-the-arts/creative-writing/start-writing-fiction/content-section-0",
        notes: "Core storytelling mechanics: character motivation, dialogue registers, and world-building arcs."
      },
      {
        title: "Writing What You Know",
        author: "The Open University",
        resource_type: "course",
        url: "https://www.open.edu/openlearn/history-the-arts/creative-writing",
        notes: "Techniques for transforming subjective memory and lived experience into vivid personal essays and SOP narratives."
      },
      {
        title: "Beginner's Guide to Industrial Design Sketching",
        author: "Jackie Create",
        resource_type: "video",
        url: "https://www.youtube.com/@jackiecreate",
        notes: "Practical video tutorials on pencil/pen line confidence, perspective grids, ellipses, and volumetric carving."
      },
      {
        title: "Jackie Create Design Sketching Portal",
        author: "Jackie Create",
        resource_type: "website",
        url: "https://beacons.page/jackiecreate",
        notes: "Free design sketching templates, line confidence exercises, and reference work for rapid product ideation."
      }
    ]
  },

  // ── SELF ───────────────────────────────────────────────────────────────────
  {
    category: 'Self', title: 'Stoicism & Emotional Architecture', estimated_hours: 30,
    description: 'Not pop psychology. Primary texts, actionable daily practice, and converting rage and perfectionism into fuel.',
    topics: [
      { title: 'Meditations by Marcus Aurelius: Books I-IV with annotation', estimated_hours: 4, is_recommended_next: true },
      { title: 'Epictetus: The Enchiridion, complete', estimated_hours: 2 },
      { title: 'Seneca: Letters from a Stoic, selected', estimated_hours: 3 },
      { title: 'The dichotomy of control: daily practice', estimated_hours: 2 },
      { title: 'Amor fati: loving what is, not what should be', estimated_hours: 2 },
      { title: "Managing rage: the Stoic view on anger (Seneca's De Ira)", estimated_hours: 3 },
      { title: 'Perfectionism as a trap: the Stoic antidote', estimated_hours: 2 },
      { title: 'Rejection as data: reframing failure systematically', estimated_hours: 2 },
      { title: 'Emotional detachment without numbness: the distinction', estimated_hours: 2 },
      { title: 'Building a daily Stoic practice: journaling, reflection', estimated_hours: 2 },
    ],
    resources: [
      { title: 'Meditations', author: 'Marcus Aurelius (Gregory Hays tr.)', resource_type: 'book' },
      { title: 'Letters from a Stoic', author: 'Seneca (Robin Campbell tr.)', resource_type: 'book' },
      { title: 'How to Think Like a Roman Emperor', author: 'Donald Robertson', resource_type: 'book' },
    ],
  },
  {
    category: 'Self', title: 'Philosophy: From Foundations to Nietzsche', estimated_hours: 40,
    description: 'A curated path from the Greeks to existentialism that builds genuine intellectual framework.',
    topics: [
      { title: 'Pre-Socratics: the first questions', estimated_hours: 2, is_recommended_next: true },
      { title: 'Plato: The Republic, key dialogues', estimated_hours: 4 },
      { title: 'Aristotle: Nicomachean Ethics, Politics', estimated_hours: 3 },
      { title: 'Epistemology: how do we know what we know', estimated_hours: 3 },
      { title: 'Descartes and the modern turn', estimated_hours: 2 },
      { title: 'Hume and empiricism', estimated_hours: 2 },
      { title: 'Kant: what can we know, what should we do', estimated_hours: 3 },
      { title: 'Schopenhauer: will, suffering, art', estimated_hours: 3 },
      { title: 'Nietzsche: Beyond Good and Evil, Thus Spoke Zarathustra', estimated_hours: 4 },
      { title: 'Existentialism: Sartre, Camus, Beauvoir', estimated_hours: 3 },
      { title: 'Philosophy of science: Popper, Kuhn, Feyerabend', estimated_hours: 3 },
    ],
    resources: [
      { title: "Sophie's World (orientation map only)", author: 'Jostein Gaarder', resource_type: 'book' },
      { title: 'Stanford Encyclopedia of Philosophy', resource_type: 'article', url: 'https://plato.stanford.edu' },
    ],
  },
  {
    category: 'Self', title: 'History & Civilization', estimated_hours: 45,
    description: 'Not dates and wars. The patterns of how civilizations rise, fracture, and what they leave behind.',
    topics: [
      { title: 'Ancient Mesopotamia and Egypt: the first cities', estimated_hours: 2, is_recommended_next: true },
      { title: 'Classical Greece: politics, philosophy, collapse', estimated_hours: 3 },
      { title: 'Rome: republic to empire to fall', estimated_hours: 3 },
      { title: 'Islamic Golden Age: the knowledge transmission', estimated_hours: 2 },
      { title: 'Medieval Europe and the Church', estimated_hours: 2 },
      { title: 'Renaissance and the rebirth of the individual', estimated_hours: 3 },
      { title: 'Colonialism and its long shadow', estimated_hours: 3 },
      { title: 'Industrial Revolution and its discontents', estimated_hours: 2 },
      { title: '20th century: two world wars, decolonization, Cold War', estimated_hours: 4 },
      { title: 'Japan: Edo period to modern empire to surrender to now', estimated_hours: 4 },
      { title: 'South Asia: partition, independence, and aftermath', estimated_hours: 3 },
      { title: 'Contemporary geopolitics: the world as it actually is', estimated_hours: 3 },
    ],
    resources: [
      { title: 'Sapiens', author: 'Yuval Noah Harari', resource_type: 'book' },
      { title: 'Guns Germs and Steel', author: 'Jared Diamond', resource_type: 'book' },
      { title: 'The Silk Roads', author: 'Peter Frankopan', resource_type: 'book' },
    ],
  },
  {
    category: 'Self', title: 'Japanese Language & Culture', estimated_hours: 60,
    description: 'Duolingo is not working. This curriculum fixes the method with spaced repetition and real context.',
    topics: [
      { title: 'Hiragana and Katakana: complete, no shortcuts', estimated_hours: 4, is_recommended_next: true },
      { title: 'Anki setup: building your personal SRS deck', estimated_hours: 1 },
      { title: 'JLPT N5 vocabulary: core 800 words via Anki', estimated_hours: 10 },
      { title: 'Basic sentence structure: SOV, particles', estimated_hours: 3 },
      { title: 'Greetings, daily life phrases: functional Japanese', estimated_hours: 3 },
      { title: 'JLPT N4 vocabulary: next 1500 words', estimated_hours: 15 },
      { title: 'Verb conjugation: te-form, ta-form, masu', estimated_hours: 4 },
      { title: 'Reading simple manga: Yotsuba recommended', estimated_hours: 5 },
      { title: 'Japanese culture and history: Edo, Meiji, postwar', estimated_hours: 4 },
      { title: 'Introduction to kanji: radicals method', estimated_hours: 4 },
    ],
    resources: [
      { title: 'Genki I textbook', resource_type: 'book' },
      { title: 'Anki + Core 2000 deck', resource_type: 'course' },
      { title: 'Comprehensible Japanese (YouTube)', resource_type: 'video' },
      { title: 'Yotsuba manga', author: 'Kiyohiko Azuma', resource_type: 'book' },
    ],
  },
  {
    category: 'Self', title: 'Fitness, Nutrition & Human Physiology', estimated_hours: 35,
    description: 'The Greek goddess physique is a body composition goal. This covers the science behind training and family medical contexts.',
    topics: [
      { title: 'Muscle physiology: how hypertrophy actually works', estimated_hours: 3, is_recommended_next: true },
      { title: 'Calisthenics programming: progressive overload without weights', estimated_hours: 3 },
      { title: 'Macronutrient fundamentals: protein, carbs, fat for body recomposition', estimated_hours: 3 },
      { title: 'Micronutrients: iron, calcium, vitamin D, B12', estimated_hours: 2 },
      { title: 'Meal timing and eating windows', estimated_hours: 2 },
      { title: 'Type 2 diabetes: management, nutrition, monitoring', estimated_hours: 3 },
      { title: 'Cardiovascular disease: lifestyle factors, medications', estimated_hours: 2 },
      { title: 'Spinal injuries: care, mobility, what not to do', estimated_hours: 2 },
      { title: 'Menopause: hormonal changes, nutrition, what actually helps', estimated_hours: 2 },
      { title: 'Sleep and recovery science', estimated_hours: 2 },
      { title: 'Stress and cortisol: how rage and perfectionism affect body composition', estimated_hours: 2 },
    ],
    resources: [
      { title: 'Huberman Lab (specific episodes)', resource_type: 'video' },
      { title: "Peter Attia's work on longevity", resource_type: 'article' },
      { title: 'RP Strength for training science', resource_type: 'course' },
    ],
  },
  {
    category: 'Self', title: 'Personal Finance & FI Architecture', estimated_hours: 30,
    description: 'Starting from zero. The specific path from student to financially independent within 10 years.',
    topics: [
      { title: 'How money actually works: the basics nobody teaches', estimated_hours: 2, is_recommended_next: true },
      { title: 'Budgeting on a student income: what matters', estimated_hours: 2 },
      { title: 'Understanding compound interest: the only magic in finance', estimated_hours: 2 },
      { title: 'European banking and financial systems', estimated_hours: 2 },
      { title: 'Index funds and passive investing: the simple path', estimated_hours: 3 },
      { title: 'How startups are funded: equity, dilution, term sheets', estimated_hours: 3 },
      { title: 'Freelancing and consulting income streams', estimated_hours: 2 },
      { title: 'Scholarship funding as financial strategy', estimated_hours: 2 },
      { title: 'Tax basics: EU country differences', estimated_hours: 2 },
      { title: 'Building a 10-year FI roadmap: from MSc to independence', estimated_hours: 4 },
    ],
    resources: [
      { title: 'The Psychology of Money', author: 'Morgan Housel', resource_type: 'book' },
      { title: 'The Simple Path to Wealth', author: 'JL Collins', resource_type: 'book' },
      { title: 'Paul Graham essays on startups', resource_type: 'article' },
    ],
  },
  {
    category: 'Self', title: 'Observation, Deduction & Vocabulary', estimated_hours: 25,
    description: 'The underlying skills that make everything else sharper: writing, research, conversation, reading people.',
    topics: [
      { title: 'The art of close observation: how to actually see', estimated_hours: 2, is_recommended_next: true },
      { title: 'Sherlock method: systematic deduction from evidence', estimated_hours: 2 },
      { title: 'Cognitive biases: what distorts your perception', estimated_hours: 3 },
      { title: 'Etymology: where words come from and why it matters', estimated_hours: 2 },
      { title: 'Vocabulary acquisition: deliberate not passive', estimated_hours: 2 },
      { title: 'Argument mapping: identifying logic and fallacies', estimated_hours: 3 },
      { title: 'Active listening: what you miss when you are talking', estimated_hours: 2 },
      { title: 'Observation journaling: daily practice', estimated_hours: 1 },
      { title: 'Reading body language and context', estimated_hours: 2 },
      { title: 'Discernment: separating signal from noise in information', estimated_hours: 2 },
    ],
    resources: [
      { title: 'The Art of Thinking Clearly', author: 'Rolf Dobelli', resource_type: 'book' },
      { title: 'A Mind for Numbers', author: 'Barbara Oakley', resource_type: 'book' },
    ],
  },
  {
    category: 'Self', title: 'Writing & Articulation', estimated_hours: 40,
    description: 'Writing like Virginia Woolf is a real goal. This treats writing as a craft with specific learnable components.',
    topics: [
      { title: 'Sentence: the unit of thought', estimated_hours: 2, is_recommended_next: true },
      { title: 'Paragraph structure: how ideas move', estimated_hours: 2 },
      { title: 'Voice: what it is and how to find yours', estimated_hours: 3 },
      { title: 'Reading like a writer: annotating for craft not content', estimated_hours: 3 },
      { title: 'Virginia Woolf: Mrs Dalloway with craft annotations', estimated_hours: 4 },
      { title: 'Stream of consciousness: technique and application', estimated_hours: 2 },
      { title: 'Essay writing: the personal essay as intellectual form', estimated_hours: 3 },
      { title: 'Writing about complex ideas for non-experts', estimated_hours: 3 },
      { title: 'Editing: the discipline of cutting', estimated_hours: 2 },
      { title: 'Substack as a writing practice: publishing cadence', estimated_hours: 2 },
      { title: 'Academic voice vs personal voice: switching registers', estimated_hours: 2 },
    ],
    resources: [
      { title: 'Bird by Bird', author: 'Anne Lamott', resource_type: 'book' },
      { title: 'On Writing', author: 'Stephen King', resource_type: 'book' },
      { title: 'Mrs Dalloway', author: 'Virginia Woolf', resource_type: 'book' },
    ],
  },
]

export const SEED_MEDIA_LOG = [
  { title: 'Thinking in Systems', author_or_creator: 'Donella Meadows', media_type: 'book', status: 'want_to', tags: ['systems-thinking', 'academic'] },
  { title: 'The Psychology of Money', author_or_creator: 'Morgan Housel', media_type: 'book', status: 'want_to', tags: ['finance'] },
  { title: 'Meditations', author_or_creator: 'Marcus Aurelius (Gregory Hays tr.)', media_type: 'book', status: 'in_progress', tags: ['stoicism', 'philosophy'] },
  { title: 'Mrs Dalloway', author_or_creator: 'Virginia Woolf', media_type: 'book', status: 'want_to', tags: ['writing', 'literature'] },
  { title: 'Sapiens', author_or_creator: 'Yuval Noah Harari', media_type: 'book', status: 'want_to', tags: ['history'] },
  { title: 'The Silk Roads', author_or_creator: 'Peter Frankopan', media_type: 'book', status: 'want_to', tags: ['history'] },
  { title: 'Bird by Bird', author_or_creator: 'Anne Lamott', media_type: 'book', status: 'want_to', tags: ['writing'] },
  { title: 'Guns Germs and Steel', author_or_creator: 'Jared Diamond', media_type: 'book', status: 'want_to', tags: ['history', 'systems-thinking'] },
  { title: 'The Art of Thinking Clearly', author_or_creator: 'Rolf Dobelli', media_type: 'book', status: 'want_to', tags: ['observation', 'psychology'] },
  { title: 'Letters from a Stoic', author_or_creator: 'Seneca (Robin Campbell tr.)', media_type: 'book', status: 'want_to', tags: ['stoicism'] },
  { title: 'Genki I', author_or_creator: 'Eri Banno et al.', media_type: 'book', status: 'in_progress', tags: ['japanese'] },
  { title: 'The Simple Path to Wealth', author_or_creator: 'JL Collins', media_type: 'book', status: 'want_to', tags: ['finance'] },
  { title: 'How to Think Like a Roman Emperor', author_or_creator: 'Donald Robertson', media_type: 'book', status: 'want_to', tags: ['stoicism'] },
  { title: 'Yotsuba manga Vol 1', author_or_creator: 'Kiyohiko Azuma', media_type: 'book', status: 'want_to', tags: ['japanese'] },
  { title: 'Beyond Good and Evil', author_or_creator: 'Nietzsche', media_type: 'book', status: 'want_to', tags: ['philosophy'] },

  // ── FOUNDATIONAL DISCIPLINES: 24 VERIFIED ASSETS ─────────────────────────
  {
    title: "The Problems of Philosophy",
    author_or_creator: "Bertrand Russell",
    media_type: "book",
    status: "want_to",
    tags: [
"philosophy",
"foundational"
    ],
    one_line_takeaway: "Appearance vs reality, epistemology, and the limits of knowledge",
    full_review: "URL: https://www.gutenberg.org/ebooks/5827"
  },
  {
    title: "The Undercover Economist",
    author_or_creator: "Tim Harford",
    media_type: "book",
    status: "want_to",
    tags: [
"economics",
"foundational"
    ],
    one_line_takeaway: "Microeconomic incentives, pricing strategies, market failures",
    full_review: "URL: https://timharford.com/books/undercovereconomist/"
  },
  {
    title: "The Story of Art",
    author_or_creator: "E.H. Gombrich",
    media_type: "book",
    status: "want_to",
    tags: [
"art-history",
"foundational"
    ],
    one_line_takeaway: "Master introduction to the visual evolution of human art",
    full_review: "URL: https://www.phaidon.com/store/art/the-story-of-art-9780714832470/"
  },
  {
    title: "Six Easy Pieces",
    author_or_creator: "Richard Feynman",
    media_type: "book",
    status: "want_to",
    tags: [
"physics",
"foundational"
    ],
    one_line_takeaway: "Accessible foundational physics: atoms, energy, gravity, quantum behavior",
    full_review: "URL: https://www.feynmanlectures.caltech.edu/"
  },
  {
    title: "A Little History of the World",
    author_or_creator: "E.H. Gombrich",
    media_type: "book",
    status: "want_to",
    tags: [
"history",
"foundational"
    ],
    one_line_takeaway: "Narrative history of human civilization across all eras",
    full_review: "URL: https://yalebooks.yale.edu/book/9780300143324/a-little-history-of-the-world/"
  },
  {
    title: "The Joy of X",
    author_or_creator: "Steven Strogatz",
    media_type: "book",
    status: "want_to",
    tags: [
"mathematics",
"foundational"
    ],
    one_line_takeaway: "Intuitive journey through numbers, geometry, calculus, and infinity",
    full_review: "URL: https://www.stevenstrogatz.com/books/the-joy-of-x"
  },
  {
    title: "Justice: What's the Right Thing to Do?",
    author_or_creator: "Michael Sandel",
    media_type: "book",
    status: "want_to",
    tags: [
"politics",
"foundational"
    ],
    one_line_takeaway: "Moral dilemmas, utilitarianism, Kantian duty, and theories of justice",
    full_review: "URL: https://justiceharvard.org/"
  },
  {
    title: "The Language Instinct",
    author_or_creator: "Steven Pinker",
    media_type: "book",
    status: "want_to",
    tags: [
"linguistics",
"foundational"
    ],
    one_line_takeaway: "Language as a biological adaptation, universal grammar, and cognition",
    full_review: "URL: https://stevenpinker.com/publications/language-instinct"
  },
  {
    title: "Death (PHIL 176)",
    author_or_creator: "Prof. Shelly Kagan",
    media_type: "course",
    status: "want_to",
    tags: [
"philosophy",
"foundational",
"lecture"
    ],
    one_line_takeaway: "Philosophical analysis of mortality, personal identity, and the value of life",
    full_review: "URL: https://oyc.yale.edu/philosophy/phil-176"
  },
  {
    title: "Principles of Economics: Microeconomics",
    author_or_creator: "Tyler Cowen & Alex Tabarrok (Marginal Revolution University)",
    media_type: "course",
    status: "want_to",
    tags: [
"economics",
"foundational",
"lecture"
    ],
    one_line_takeaway: "Supply, demand, elasticity, price mechanisms, externalities",
    full_review: "URL: https://mru.org/principles-economics-microeconomics-0"
  },
  {
    title: "Smarthistory",
    author_or_creator: "Dr. Beth Harris & Dr. Steven Zucker",
    media_type: "video",
    status: "want_to",
    tags: [
"art-history",
"foundational",
"video"
    ],
    one_line_takeaway: "Conversational, museum-grounded visual analysis of artworks",
    full_review: "URL: https://smarthistory.org/"
  },
  {
    title: "PBS Space Time",
    author_or_creator: "Dr. Matt O'Dowd",
    media_type: "video",
    status: "want_to",
    tags: [
"physics",
"foundational",
"video"
    ],
    one_line_takeaway: "Astrophysics, relativity, quantum paradoxes, and entropy",
    full_review: "URL: https://www.youtube.com/@pbsspacetime"
  },
  {
    title: "The Early Middle Ages, 284-1000 (HIST 210)",
    author_or_creator: "Prof. Paul Freedman",
    media_type: "course",
    status: "want_to",
    tags: [
"history",
"foundational",
"lecture"
    ],
    one_line_takeaway: "Late Roman transition, Byzantium, early Islam, Charlemagne, feudalism",
    full_review: "URL: https://oyc.yale.edu/history/hist-210"
  },
  {
    title: "Essence of Linear Algebra",
    author_or_creator: "Grant Sanderson (3Blue1Brown)",
    media_type: "video",
    status: "want_to",
    tags: [
"mathematics",
"foundational",
"video"
    ],
    one_line_takeaway: "Geometric and visual intuition for vectors, matrices, and transformations",
    full_review: "URL: https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab"
  },
  {
    title: "Harvard Justice Lecture Series",
    author_or_creator: "Prof. Michael Sandel",
    media_type: "course",
    status: "want_to",
    tags: [
"politics",
"foundational",
"lecture"
    ],
    one_line_takeaway: "Famous 12-episode filmed course on civic virtue and moral reasoning",
    full_review: "URL: https://www.youtube.com/playlist?list=PL30C13C91CFFEFEA6"
  },
  {
    title: "Crash Course Linguistics",
    author_or_creator: "Taylor Behnke / CrashCourse",
    media_type: "video",
    status: "want_to",
    tags: [
"linguistics",
"foundational",
"video"
    ],
    one_line_takeaway: "16-episode overview of morphology, syntax, phonetics, and sociolinguistics",
    full_review: "URL: https://www.youtube.com/playlist?list=PL8dPuuaLjXtP5-b_u6y-neKqXk5c2KkH9"
  },
  {
    title: "Stanford Encyclopedia of Philosophy",
    author_or_creator: "Stanford University",
    media_type: "article",
    status: "want_to",
    tags: [
"philosophy",
"foundational",
"reference"
    ],
    one_line_takeaway: "Peer-reviewed gold standard reference for philosophical concepts",
    full_review: "URL: https://plato.stanford.edu/"
  },
  {
    title: "CORE Econ Online Textbooks",
    author_or_creator: "CORE Econ Team",
    media_type: "course",
    status: "want_to",
    tags: [
"economics",
"foundational",
"interactive"
    ],
    one_line_takeaway: "Data-grounded, real-world economics (The Economy 2.0 / ESPP)",
    full_review: "URL: https://www.core-econ.org/"
  },
  {
    title: "The Met Collection & Heilbrunn Timeline",
    author_or_creator: "The Metropolitan Museum of Art",
    media_type: "article",
    status: "want_to",
    tags: [
"art-history",
"foundational",
"interactive"
    ],
    one_line_takeaway: "490,000+ digitized artworks and historical movement essays",
    full_review: "URL: https://www.metmuseum.org/art/collection"
  },
  {
    title: "PhET Interactive Simulations",
    author_or_creator: "University of Colorado Boulder",
    media_type: "course",
    status: "want_to",
    tags: [
"physics",
"foundational",
"interactive"
    ],
    one_line_takeaway: "Hands-on simulations of mechanics, waves, and quantum phenomena",
    full_review: "URL: https://phet.colorado.edu/"
  },
  {
    title: "World History Encyclopedia",
    author_or_creator: "World History Encyclopedia",
    media_type: "article",
    status: "want_to",
    tags: [
"history",
"foundational",
"reference"
    ],
    one_line_takeaway: "Peer-reviewed history articles, timelines, and primary maps",
    full_review: "URL: https://www.worldhistory.org/"
  },
  {
    title: "Project Euler",
    author_or_creator: "Project Euler Team",
    media_type: "course",
    status: "want_to",
    tags: [
"mathematics",
"foundational",
"interactive"
    ],
    one_line_takeaway: "Challenging mathematical and algorithmic problem-solving puzzles",
    full_review: "URL: https://projecteuler.net/"
  },
  {
    title: "Introduction to Political Philosophy (PLSC 114)",
    author_or_creator: "Prof. Steven B. Smith (Yale University)",
    media_type: "course",
    status: "want_to",
    tags: [
"politics",
"foundational",
"interactive"
    ],
    one_line_takeaway: "Comprehensive study of Plato, Aristotle, Machiavelli, Hobbes, Locke",
    full_review: "URL: https://oyc.yale.edu/political-science/plsc-114"
  },
  {
    title: "World Atlas of Language Structures (WALS)",
    author_or_creator: "Max Planck Institute",
    media_type: "article",
    status: "want_to",
    tags: [
"linguistics",
"foundational",
"reference"
    ],
    one_line_takeaway: "Global comparative database of structural linguistic properties across 2,500+ languages",
    full_review: "URL: https://wals.info/"
  },
  {
    title: "How to Kill Men and Get Away With It",
    author_or_creator: "Katy Brent",
    media_type: "book",
    status: "want_to",
    tags: ["fiction", "thriller", "satire", "applied"],
    one_line_takeaway: "Satirical feminist vigilante thriller exploring female friendship and accountability",
    full_review: "URL: https://www.goodreads.com/book/show/62061266-how-to-kill-men-and-get-away-with-it"
  },
  {
    title: "I Who Have Never Known Men",
    author_or_creator: "Jacqueline Harpman",
    media_type: "book",
    status: "want_to",
    tags: ["fiction", "dystopian", "existential", "applied"],
    one_line_takeaway: "Haunting existential classic about women trapped in an underground cage, solitude, and autonomy",
    full_review: "URL: https://www.goodreads.com/book/show/11996.I_Who_Have_Never_Known_Men"
  },
  {
    title: "One of the Good Guys",
    author_or_creator: "Araminta Hall",
    media_type: "book",
    status: "want_to",
    tags: ["fiction", "thriller", "psychological", "applied"],
    one_line_takeaway: "Taut deconstruction of male allyship, media sensationalism, and modern gender dynamics",
    full_review: "URL: https://www.goodreads.com/book/show/176443425-one-of-the-good-guys"
  },
]

export const DEFAULT_IELTS_PRACTICE_SCORES = [
  {
    id: 'ielts-mock-listen-2',
    title: 'IELTS Online Tests - Mock Test 2026 January Listening Test 1',
    category: 'listening',
    score: 38,
    total: 40,
    band: 8.5,
    date: '2026-09-10T10:00:00.000Z',
    url: 'https://ieltsonlinetests.com/score/mock-test-listening-01',
  },
  {
    id: 'ielts-mock-listen-1',
    title: 'IELTS Listening Practice Test 201',
    category: 'listening',
    score: 38,
    total: 40,
    band: 8.5,
    date: '2026-09-08T10:00:00.000Z',
  },
  {
    id: 'ielts-mock-read-4',
    title: 'IELTS Reading Practice Test 313',
    category: 'reading',
    score: 36,
    total: 40,
    band: 8.0,
    date: '2026-09-06T10:00:00.000Z',
    url: 'https://practicepteonline.com/official-ielts-tests-book-20/',
  },
  {
    id: 'ielts-mock-read-3',
    title: 'IELTS Reading Practice Test 312',
    category: 'reading',
    score: 35,
    total: 40,
    band: 8.0,
    date: '2026-09-04T10:00:00.000Z',
    url: 'https://practicepteonline.com/official-ielts-tests-book-20/',
  },
  {
    id: 'ielts-mock-read-2',
    title: 'IELTS Reading Practice Test 311',
    category: 'reading',
    score: 35,
    total: 40,
    band: 8.0,
    date: '2026-09-02T10:00:00.000Z',
    url: 'https://practicepteonline.com/official-ielts-tests-book-20/',
  },
  {
    id: 'ielts-mock-read-1',
    title: 'IELTS Reading Practice Test 310',
    category: 'reading',
    score: 34,
    total: 40,
    band: 7.5,
    date: '2026-08-30T10:00:00.000Z',
    url: 'https://practicepteonline.com/official-ielts-tests-book-20/',
  },
  {
    id: 'ielts-mock-write-2',
    title: 'IELTS Academic Writing Practice Test 2 - Task 1 & 2',
    category: 'writing',
    score: 7.5,
    total: null,
    band: 7.5,
    date: '2026-09-12T10:00:00.000Z',
    url: 'https://takeielts.britishcouncil.org/take-ielts/prepare/free-ielts-practice-tests/writing-practice-tests',
  },
  {
    id: 'ielts-mock-write-1',
    title: 'IELTS Academic Writing Practice Test 1 - Task 1 & 2',
    category: 'writing',
    score: 7.0,
    total: null,
    band: 7.0,
    date: '2026-09-05T10:00:00.000Z',
    url: 'https://takeielts.britishcouncil.org/take-ielts/prepare/free-ielts-practice-tests/writing-practice-tests',
  },
  {
    id: 'ielts-mock-speak-1',
    title: 'IELTS Speaking Practice Test 1 - Parts 1, 2 & 3',
    category: 'speaking',
    score: 7.5,
    total: null,
    band: 7.5,
    date: '2026-09-14T10:00:00.000Z',
    url: 'https://ieltsliz.com',
  },
]



