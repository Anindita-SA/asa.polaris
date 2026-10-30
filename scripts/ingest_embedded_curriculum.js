import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const LOCK_FILE_PATH = path.join(PROJECT_ROOT, '.user_id_lock');

if (!fs.existsSync(LOCK_FILE_PATH)) {
  console.error('Error: .user_id_lock file does not exist.');
  process.exit(1);
}

const targetUserId = fs.readFileSync(LOCK_FILE_PATH, 'utf8').trim();
if (!targetUserId) {
  console.error('Error: .user_id_lock is empty.');
  process.exit(1);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase credentials in environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

const MODULE_CHAPTERS = [
  {
    title: 'Module 1: Embedded C Mastery & Bit Manipulation',
    description: 'Pillar 1: Embedded C & Memory Architecture (11h). Bit masking, Kernighan algorithm, storage classes, volatile, const pointers, memory layout. Sources: srnvl, theEmbeddedGeorge.',
    node_title: 'Academic',
    position: 0,
  },
  {
    title: 'Module 2: Low-Level Memory, Endianness & Struct Architecture',
    description: 'Pillar 1: Embedded C & Memory Architecture (11h). Endianness detection/conversion, pointer arithmetic, struct padding/alignment, custom libc functions. Sources: srnvl, theEmbeddedGeorge.',
    node_title: 'Academic',
    position: 1,
  },
  {
    title: 'Module 3: Microcontroller Hardware & Communication Protocols',
    description: 'Pillar 2: Bare-Metal Microcontroller Architecture & Protocols (14h). GPIO push-pull/open-drain, Timers/PWM, ADC/DAC, UART, SPI, I2C, CAN Bus, Cortex-M NVIC. Source: theEmbeddedGeorge.',
    node_title: 'Academic',
    position: 2,
  },
  {
    title: 'Module 4: Systems Project Track 1: Core Systems in C',
    description: 'Pillar 3: Project-Driven Systems Programming in C (14h). UNIX shell with pipes, heap memory allocator, lock-free ring buffer, table-driven FSM. Source: nCally.',
    node_title: 'Academic',
    position: 3,
  },
  {
    title: 'Module 5: RTOS Fundamentals & Concurrency',
    description: 'Pillar 2: Bare-Metal Microcontroller Architecture & Protocols (11h). Superloop vs preemptive kernels, RMS/EDF, semaphores, mutexes, priority inversion, FreeRTOS dual-task project. Sources: imsunilvaghela, theEmbeddedGeorge.',
    node_title: 'Academic',
    position: 4,
  },
  {
    title: 'Module 6: Embedded Linux, Kernel Internals & Device Drivers',
    description: 'Pillar 4: Embedded Linux & Device Drivers (15h). U-Boot/Kernel/RootFS/DTS, Syscalls, IPC, LKMs, Character Device Drivers, Top/Bottom half IRQs, Yocto. Source: imsunilvaghela.',
    node_title: 'Academic',
    position: 5,
  },
  {
    title: 'Module 7: Systems Project Track 2: Capstone Network or Architecture Project',
    description: 'Pillar 3: Project-Driven Systems Programming in C (13h). Non-blocking HTTP/TCP server, CHIP-8 / LC-3 emulator, or key-value store in C. Source: nCally.',
    node_title: 'Academic',
    position: 6,
  },
  {
    title: 'Module 8: Embedded Interview Gauntlet & Technical Drills',
    description: 'All Pillars: Holistic Review & Technical Drills (9h). 50 embedded interview questions, bus electrical defenses, timed packet parser with CRC, Hard Fault resolution, GDB. Sources: All 4 Repositories.',
    node_title: 'Academic',
    position: 7,
  },
];

const CURRICULUM_RESOURCES = [
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
];

const RAW_TOPICS = [
  // Module 1 (9 items)
  {
    moduleIndex: 0,
    title: 'Module 1: Bitwise Operations: Master bit masking, setting, clearing, toggling, and reading specific bits using macro idioms',
    description: 'Pillar 1: Embedded C & Memory Architecture',
    estimated_hours: 1.5,
    notes: 'Register bit manipulation macros: SET_BIT, CLEAR_BIT, TOGGLE_BIT, READ_BIT. Source: srnvl/Embedded_SWE_Prep (https://github.com/srnvl/Embedded_SWE_Prep)',
  },
  {
    moduleIndex: 0,
    title: 'Module 1: Bitwise Algorithms: Implement Brian Kernighan algorithm to count set bits in C',
    description: 'Pillar 1: Embedded C & Memory Architecture',
    estimated_hours: 1.0,
    notes: 'Efficient O(k) set bit counting where k is number of set bits. Source: srnvl/Embedded_SWE_Prep (https://github.com/srnvl/Embedded_SWE_Prep)',
  },
  {
    moduleIndex: 0,
    title: 'Module 1: Bitwise Algorithms: Find the only non-repeating number in an array using XOR logic',
    description: 'Pillar 1: Embedded C & Memory Architecture',
    estimated_hours: 1.0,
    notes: 'Exploit XOR cancellation properties (x ^ x = 0, x ^ 0 = x) for O(n) time and O(1) space. Source: srnvl/Embedded_SWE_Prep (https://github.com/srnvl/Embedded_SWE_Prep)',
  },
  {
    moduleIndex: 0,
    title: 'Module 1: Bitwise Algorithms: Write functions to check power of 2 and reverse bits of 32-bit unsigned integer',
    description: 'Pillar 1: Embedded C & Memory Architecture',
    estimated_hours: 1.0,
    notes: 'Master (n & (n - 1)) == 0 check and bit reversal via divide-and-conquer shifts. Source: srnvl/Embedded_SWE_Prep (https://github.com/srnvl/Embedded_SWE_Prep)',
  },
  {
    moduleIndex: 0,
    title: 'Module 1: Keywords Deep Dive: Analyze the storage duration, scope, and linkage of static, extern, and register',
    description: 'Pillar 1: Embedded C & Memory Architecture',
    estimated_hours: 1.5,
    notes: 'Distinguish internal vs external linkage, file scope vs block scope, and compiler storage implications. Source: theEmbeddedGeorge (https://github.com/theEmbeddedGeorge/theEmbeddedNewTestament)',
  },
  {
    moduleIndex: 0,
    title: 'Module 1: Keywords Deep Dive: Master volatile (when to use in memory-mapped I/O, ISR variables, flags)',
    description: 'Pillar 1: Embedded C & Memory Architecture',
    estimated_hours: 1.5,
    notes: 'Understand compiler optimization suppression, memory barriers, and volatile pointer declarations. Source: theEmbeddedGeorge (https://github.com/theEmbeddedGeorge/theEmbeddedNewTestament)',
  },
  {
    moduleIndex: 0,
    title: 'Module 1: Type Qualifiers: Understand const pointer variants (const int *, int * const, and const int * const)',
    description: 'Pillar 1: Embedded C & Memory Architecture',
    estimated_hours: 1.0,
    notes: 'Read clockwise-spiral rule to differentiate pointer to constant data vs constant pointer to mutable data. Source: theEmbeddedGeorge (https://github.com/theEmbeddedGeorge/theEmbeddedNewTestament)',
  },
  {
    moduleIndex: 0,
    title: 'Module 1: Memory Layout: Draw and explain the standard C memory layout (Text, Data, BSS, Heap, Stack)',
    description: 'Pillar 1: Embedded C & Memory Architecture',
    estimated_hours: 1.0,
    notes: 'Map global initialized variables, zero-initialized BSS, runtime stack frames, and dynamic heap growth. Source: theEmbeddedGeorge (https://github.com/theEmbeddedGeorge/theEmbeddedNewTestament)',
  },
  {
    moduleIndex: 0,
    title: 'Module 1: Practical Drill: Complete the Bit Manipulation problem set from srnvl/Embedded_SWE_Prep',
    description: 'Pillar 1: Embedded C & Memory Architecture',
    estimated_hours: 1.5,
    notes: 'Solve all practice exercises in bit manipulation section under timed conditions. Source: srnvl/Embedded_SWE_Prep (https://github.com/srnvl/Embedded_SWE_Prep)',
  },

  // Module 2 (8 items)
  {
    moduleIndex: 1,
    title: 'Module 2: Endianness Detection: Write a C program to detect Big Endian vs Little Endian at runtime using pointers and unions',
    description: 'Pillar 1: Embedded C & Memory Architecture',
    estimated_hours: 1.0,
    notes: 'Compare multi-byte union memory representation and char pointer dereferencing of short int 0x0001. Source: srnvl/Embedded_SWE_Prep (https://github.com/srnvl/Embedded_SWE_Prep)',
  },
  {
    moduleIndex: 1,
    title: 'Module 2: Endianness Conversion: Write a fast byte-swap macro / function for 16-bit, 32-bit, and 64-bit integers',
    description: 'Pillar 1: Embedded C & Memory Architecture',
    estimated_hours: 1.0,
    notes: 'Implement byte-level shifts and compare against compiler builtins __builtin_bswap32 and htons/ntohl. Source: srnvl/Embedded_SWE_Prep (https://github.com/srnvl/Embedded_SWE_Prep)',
  },
  {
    moduleIndex: 1,
    title: 'Module 2: Pointer Arithmetic: Master void pointers, function pointers, and arrays of function pointers (jump tables)',
    description: 'Pillar 1: Embedded C & Memory Architecture',
    estimated_hours: 1.5,
    notes: 'Build dynamic jump tables for state dispatch and packet handlers. Source: theEmbeddedGeorge (https://github.com/theEmbeddedGeorge/theEmbeddedNewTestament)',
  },
  {
    moduleIndex: 1,
    title: 'Module 2: Struct Alignment: Calculate struct sizes with memory padding, alignment rules, and compiler pragma pack / attribute packed',
    description: 'Pillar 1: Embedded C & Memory Architecture',
    estimated_hours: 1.5,
    notes: 'Understand CPU word boundary access efficiency, padding penalty, and unaligned access traps. Source: theEmbeddedGeorge (https://github.com/theEmbeddedGeorge/theEmbeddedNewTestament)',
  },
  {
    moduleIndex: 1,
    title: 'Module 2: Standard Library Clones: Implement custom memcpy, memmove (handling overlapping memory), and memset',
    description: 'Pillar 1: Embedded C & Memory Architecture',
    estimated_hours: 2.0,
    notes: 'Handle source and destination overlap in memmove by backward copying when dest > src. Source: srnvl/Embedded_SWE_Prep (https://github.com/srnvl/Embedded_SWE_Prep)',
  },
  {
    moduleIndex: 1,
    title: 'Module 2: String Manipulation in C: Implement my_strstr, my_strcpy, and custom atoi without standard library dependencies',
    description: 'Pillar 1: Embedded C & Memory Architecture',
    estimated_hours: 1.5,
    notes: 'Safe zero-dependency string handling, integer overflow checks in atoi, and pointer increments. Source: srnvl/Embedded_SWE_Prep (https://github.com/srnvl/Embedded_SWE_Prep)',
  },
  {
    moduleIndex: 1,
    title: 'Module 2: Linked Lists for Embedded: Implement an in-place singly linked list reversal and circular linked list in pure C',
    description: 'Pillar 1: Embedded C & Memory Architecture',
    estimated_hours: 1.0,
    notes: 'Master pointer manipulation with 3 pointers (prev, curr, next) and circular buffer link management. Source: srnvl/Embedded_SWE_Prep (https://github.com/srnvl/Embedded_SWE_Prep)',
  },
  {
    moduleIndex: 1,
    title: 'Module 2: Practical Drill: Solve Flatten Multi-Level Linked List and Detect Endianness from srnvl/Embedded_SWE_Prep',
    description: 'Pillar 1: Embedded C & Memory Architecture',
    estimated_hours: 1.5,
    notes: 'Solve memory and pointer tracking questions from srnvl repository. Source: srnvl/Embedded_SWE_Prep (https://github.com/srnvl/Embedded_SWE_Prep)',
  },

  // Module 3 (9 items)
  {
    moduleIndex: 2,
    title: 'Module 3: Hardware Fundamentals: Understand open-drain vs push-pull GPIO, pull-up/pull-down resistor calculations, and floating pins',
    description: 'Pillar 2: Bare-Metal Microcontroller Architecture & Protocols',
    estimated_hours: 1.5,
    notes: 'Electrical circuit topologies, bus driving, leakage current, and safe pin termination. Source: theEmbeddedGeorge (https://github.com/theEmbeddedGeorge/theEmbeddedNewTestament)',
  },
  {
    moduleIndex: 2,
    title: 'Module 3: Analog Interfacing: ADC resolution, sampling rates, sample-and-hold circuits, and DAC basics',
    description: 'Pillar 2: Bare-Metal Microcontroller Architecture & Protocols',
    estimated_hours: 1.5,
    notes: 'Quantization error, ENOB (effective number of bits), Nyquist criterion, and SAR vs Sigma-Delta ADCs. Source: theEmbeddedGeorge (https://github.com/theEmbeddedGeorge/theEmbeddedNewTestament)',
  },
  {
    moduleIndex: 2,
    title: 'Module 3: Timers & PWM: Clock prescalers, auto-reload registers, capture/compare channels, and PWM duty cycle control',
    description: 'Pillar 2: Bare-Metal Microcontroller Architecture & Protocols',
    estimated_hours: 1.5,
    notes: 'Timer peripheral frequency calculations: f_timer = f_clk / ((PSC + 1) * (ARR + 1)). Source: theEmbeddedGeorge (https://github.com/theEmbeddedGeorge/theEmbeddedNewTestament)',
  },
  {
    moduleIndex: 2,
    title: 'Module 3: Protocol Deep Dive: UART: Baud rate generation, framing errors, parity, flow control (RTS/CTS), and ring buffer integration',
    description: 'Pillar 2: Bare-Metal Microcontroller Architecture & Protocols',
    estimated_hours: 1.5,
    notes: 'Asynchronous serial framing: start bit, 8 data bits, parity, stop bits, and hardware flow control lines. Source: theEmbeddedGeorge (https://github.com/theEmbeddedGeorge/theEmbeddedNewTestament)',
  },
  {
    moduleIndex: 2,
    title: 'Module 3: Protocol Deep Dive: SPI: Master-Slave topology, CPOL and CPHA clock polarity modes, Chip Select timings, and DMA transfers',
    description: 'Pillar 2: Bare-Metal Microcontroller Architecture & Protocols',
    estimated_hours: 1.5,
    notes: 'Analyze SPI Modes 0, 1, 2, 3 with timing diagrams, clock edge latching, and high-throughput DMA chaining. Source: theEmbeddedGeorge (https://github.com/theEmbeddedGeorge/theEmbeddedNewTestament)',
  },
  {
    moduleIndex: 2,
    title: 'Module 3: Protocol Deep Dive: I2C: 7-bit vs 10-bit addressing, Start/Stop conditions, ACK/NACK, clock stretching, and multi-master arbitration',
    description: 'Pillar 2: Bare-Metal Microcontroller Architecture & Protocols',
    estimated_hours: 1.5,
    notes: 'Open-drain serial bus with wired-AND logic, bus capacitance limits, pull-up sizing, and collision detection. Source: theEmbeddedGeorge (https://github.com/theEmbeddedGeorge/theEmbeddedNewTestament)',
  },
  {
    moduleIndex: 2,
    title: 'Module 3: Protocol Deep Dive: CAN Bus: Differential signaling, CAN frame anatomy, bit stuffing, identifier priority arbitration, and fault confinement',
    description: 'Pillar 2: Bare-Metal Microcontroller Architecture & Protocols',
    estimated_hours: 2.0,
    notes: 'Dominant vs recessive bits (CAN_H and CAN_L), 11-bit standard vs 29-bit extended frames, CRC delimiting, and error counters. Source: theEmbeddedGeorge (https://github.com/theEmbeddedGeorge/theEmbeddedNewTestament)',
  },
  {
    moduleIndex: 2,
    title: 'Module 3: Interrupt Architecture: ARM Cortex-M NVIC, interrupt vector tables, interrupt priorities, latency, and writing re-entrant ISRs',
    description: 'Pillar 2: Bare-Metal Microcontroller Architecture & Protocols',
    estimated_hours: 1.5,
    notes: 'Priority grouping (preemption vs sub-priority), tail-chaining, late arriving interrupts, and ISR re-entrancy rules. Source: theEmbeddedGeorge (https://github.com/theEmbeddedGeorge/theEmbeddedNewTestament)',
  },
  {
    moduleIndex: 2,
    title: 'Module 3: Practical Drill: Review George Li Communication Protocols interview summary sheets and notes',
    description: 'Pillar 2: Bare-Metal Microcontroller Architecture & Protocols',
    estimated_hours: 1.5,
    notes: 'Study cheat sheets comparing UART vs SPI vs I2C vs CAN electrical and protocol differences. Source: theEmbeddedGeorge (https://github.com/theEmbeddedGeorge/theEmbeddedNewTestament)',
  },

  // Module 4 (5 items)
  {
    moduleIndex: 3,
    title: 'Module 4: Build a Custom Shell: Create a UNIX shell in C with command parsing, fork, execvp, background jobs, and piping',
    description: 'Pillar 3: Project-Driven Systems Programming in C',
    estimated_hours: 4.0,
    notes: 'Process lifecycle, waitpid, signal handling (SIGINT, SIGTSTP, SIGCHLD), file descriptor redirection with dup2. Source: nCally/Project-Based-Tutorials-in-C (https://github.com/nCally/Project-Based-Tutorials-in-C)',
  },
  {
    moduleIndex: 3,
    title: 'Module 4: Build a Memory Allocator: Implement a bare-bones malloc, calloc, and free using sbrk or linked chunk tracking',
    description: 'Pillar 3: Project-Driven Systems Programming in C',
    estimated_hours: 3.5,
    notes: 'Implement block metadata headers, first-fit or best-fit search, chunk splitting, and coalescing free blocks. Source: nCally/Project-Based-Tutorials-in-C (https://github.com/nCally/Project-Based-Tutorials-in-C)',
  },
  {
    moduleIndex: 3,
    title: 'Module 4: Build a Circular Buffer (Ring Buffer): Write a lock-free single-producer single-consumer circular buffer for UART data streaming',
    description: 'Pillar 3: Project-Driven Systems Programming in C',
    estimated_hours: 2.5,
    notes: 'Modulo vs power-of-two mask indexing, head/tail pointers with atomic barriers, and overrun/underrun handling. Source: nCally/Project-Based-Tutorials-in-C (https://github.com/nCally/Project-Based-Tutorials-in-C)',
  },
  {
    moduleIndex: 3,
    title: 'Module 4: Build a Finite State Machine (FSM): Implement a table-driven state machine in C using function pointers for embedded device control',
    description: 'Pillar 3: Project-Driven Systems Programming in C',
    estimated_hours: 2.0,
    notes: '2D transition matrix next_state = transition_table[current_state][event], state entry/exit actions, and event queues. Source: nCally/Project-Based-Tutorials-in-C (https://github.com/nCally/Project-Based-Tutorials-in-C)',
  },
  {
    moduleIndex: 3,
    title: 'Module 4: Code Quality: Run GCC with -Wall -Wextra -Werror -pedantic and verify clean memory with Valgrind / AddressSanitizer',
    description: 'Pillar 3: Project-Driven Systems Programming in C',
    estimated_hours: 2.0,
    notes: 'Strict compiler flag enforcement, memory leak audits, out-of-bounds checks, and undefined behavior elimination. Source: nCally/Project-Based-Tutorials-in-C (https://github.com/nCally/Project-Based-Tutorials-in-C)',
  },

  // Module 5 (7 items)
  {
    moduleIndex: 4,
    title: 'Module 5: RTOS vs Bare-Metal: Superloop architecture vs preemptive scheduling trade-offs',
    description: 'Pillar 2: Bare-Metal Microcontroller Architecture & Protocols',
    estimated_hours: 1.5,
    notes: 'Latency determinism, memory footprint overhead, context switch costs, and when a bare-metal state machine is superior. Source: TheEmbeDEADInterview (https://github.com/imsunilvaghela/TheEmbeDEADInterview)',
  },
  {
    moduleIndex: 4,
    title: 'Module 5: Scheduling Algorithms: Rate Monotonic Scheduling (RMS), Earliest Deadline First (EDF), and Round Robin',
    description: 'Pillar 2: Bare-Metal Microcontroller Architecture & Protocols',
    estimated_hours: 1.5,
    notes: 'Fixed-priority static scheduling bounds: utilization bound U <= n(2^(1/n) - 1) (~69.3%) vs dynamic EDF optimal utilization (100%). Source: theEmbeddedGeorge (https://github.com/theEmbeddedGeorge/theEmbeddedNewTestament)',
  },
  {
    moduleIndex: 4,
    title: 'Module 5: Synchronization Primitives: Mutex vs Counting Semaphore vs Binary Semaphore',
    description: 'Pillar 2: Bare-Metal Microcontroller Architecture & Protocols',
    estimated_hours: 1.5,
    notes: 'Ownership semantics, recursive locks, signaling between ISR and task, and resource counting. Source: theEmbeddedGeorge (https://github.com/theEmbeddedGeorge/theEmbeddedNewTestament)',
  },
  {
    moduleIndex: 4,
    title: 'Module 5: Real-Time Hazards: Priority Inversion, Priority Inheritance, and Deadlock detection (Coffman conditions)',
    description: 'Pillar 2: Bare-Metal Microcontroller Architecture & Protocols',
    estimated_hours: 1.5,
    notes: 'Mars Pathfinder incident case study, priority ceiling protocol vs priority inheritance, and breaking circular waits. Source: TheEmbeDEADInterview (https://github.com/imsunilvaghela/TheEmbeDEADInterview)',
  },
  {
    moduleIndex: 4,
    title: 'Module 5: Inter-Task Communication: Message queues, event flags, task notifications, and shared memory',
    description: 'Pillar 2: Bare-Metal Microcontroller Architecture & Protocols',
    estimated_hours: 1.5,
    notes: 'Pass-by-value vs pass-by-reference in FreeRTOS queues, lightweight direct-to-task notifications (30% faster than semaphores). Source: theEmbeddedGeorge (https://github.com/theEmbeddedGeorge/theEmbeddedNewTestament)',
  },
  {
    moduleIndex: 4,
    title: 'Module 5: Critical Sections: Disabling interrupts vs task locking vs spinlocks',
    description: 'Pillar 2: Bare-Metal Microcontroller Architecture & Protocols',
    estimated_hours: 1.5,
    notes: 'taskENTER_CRITICAL() / taskEXIT_CRITICAL(), interrupt masking levels in Cortex-M basepri, and multi-core spinlock safety. Source: TheEmbeDEADInterview (https://github.com/imsunilvaghela/TheEmbeDEADInterview)',
  },
  {
    moduleIndex: 4,
    title: 'Module 5: FreeRTOS Practice: Create a 2-task FreeRTOS project simulating a sensor reading task and an alert output task',
    description: 'Pillar 2: Bare-Metal Microcontroller Architecture & Protocols',
    estimated_hours: 2.0,
    notes: 'Build practical task definitions, priority assignment, queue transmission, and idle hook verification. Source: TheEmbeDEADInterview (https://github.com/imsunilvaghela/TheEmbeDEADInterview)',
  },

  // Module 6 (8 items)
  {
    moduleIndex: 5,
    title: 'Module 6: Embedded Linux Architecture: Bootloader (U-Boot), Linux Kernel, Root Filesystem, and Device Tree (.dts/.dtsi)',
    description: 'Pillar 4: Embedded Linux & Device Drivers',
    estimated_hours: 2.0,
    notes: 'ARM boot sequence: ROM code -> SPL -> U-Boot -> Kernel image + DTB -> init process (systemd/busybox). Source: TheEmbeDEADInterview (https://github.com/imsunilvaghela/TheEmbeDEADInterview)',
  },
  {
    moduleIndex: 5,
    title: 'Module 6: Kernel Space vs User Space: Syscalls, virtual memory management, page tables, and context switching overhead',
    description: 'Pillar 4: Embedded Linux & Device Drivers',
    estimated_hours: 2.0,
    notes: 'MMU page translation, TLB flushes, software interrupt / sysenter entry, user copy routines (copy_to_user, copy_from_user). Source: TheEmbeDEADInterview (https://github.com/imsunilvaghela/TheEmbeDEADInterview)',
  },
  {
    moduleIndex: 5,
    title: 'Module 6: Inter-Process Communication (IPC): Pipes, Named FIFOs, POSIX Shared Memory, Message Queues, and UNIX Domain Sockets',
    description: 'Pillar 4: Embedded Linux & Device Drivers',
    estimated_hours: 2.0,
    notes: 'Performance benchmarks, synchronization with semaphores, zero-copy shared memory vs kernel-buffered sockets. Source: TheEmbeDEADInterview (https://github.com/imsunilvaghela/TheEmbeDEADInterview)',
  },
  {
    moduleIndex: 5,
    title: 'Module 6: Linux Kernel Module (LKM): Write, compile, and insert a "Hello World" kernel module using insmod, rmmod, and dmesg',
    description: 'Pillar 4: Embedded Linux & Device Drivers',
    estimated_hours: 2.0,
    notes: 'Makefile with KDIR, module_init() and module_exit() macros, kernel print levels (pr_info, KERN_ALERT), and module licensing. Source: TheEmbeDEADInterview (https://github.com/imsunilvaghela/TheEmbeDEADInterview)',
  },
  {
    moduleIndex: 5,
    title: 'Module 6: Character Device Driver: Build a character driver implementing open(), release(), read(), write(), and ioctl()',
    description: 'Pillar 4: Embedded Linux & Device Drivers',
    estimated_hours: 2.5,
    notes: 'struct file_operations, major and minor device number allocation (alloc_chrdev_region), cdev initialization, and sysfs device node creation. Source: TheEmbeDEADInterview (https://github.com/imsunilvaghela/TheEmbeDEADInterview)',
  },
  {
    moduleIndex: 5,
    title: 'Module 6: Interrupt Handling in Linux: Top half (hard ISR) vs Bottom half (Tasklets, Workqueues, Threaded IRQs)',
    description: 'Pillar 4: Embedded Linux & Device Drivers',
    estimated_hours: 1.5,
    notes: 'Atomic top-half interrupt service routines vs deferred bottom-half execution in process context (workqueues) vs softirq context. Source: TheEmbeDEADInterview (https://github.com/imsunilvaghela/TheEmbeDEADInterview)',
  },
  {
    moduleIndex: 5,
    title: 'Module 6: Build Systems & Cross-Compilation: Configure a cross-compile toolchain (arm-none-eabi-gcc or arm-linux-gnueabihf-gcc)',
    description: 'Pillar 4: Embedded Linux & Device Drivers',
    estimated_hours: 1.5,
    notes: 'Sysroot configuration, target architecture flags (-mcpu=cortex-a7, -mfloat-abi=hard), and library linking. Source: TheEmbeDEADInterview (https://github.com/imsunilvaghela/TheEmbeDEADInterview)',
  },
  {
    moduleIndex: 5,
    title: 'Module 6: Yocto / Buildroot Overview: Understand recipes, layers, bitbake targets, and generating custom minimal Linux images',
    description: 'Pillar 4: Embedded Linux & Device Drivers',
    estimated_hours: 1.5,
    notes: 'Buildroot vs Yocto architectural comparison, BitBake recipe syntax (do_compile, do_install), machine configuration, and BSP layers. Source: TheEmbeDEADInterview (https://github.com/imsunilvaghela/TheEmbeDEADInterview)',
  },

  // Module 7 (5 items)
  {
    moduleIndex: 6,
    title: 'Module 7: Project Option A (Network Stack): Build a lightweight HTTP/TCP web server in C utilizing socket programming, non-blocking I/O, and epoll()',
    description: 'Pillar 3: Project-Driven Systems Programming in C',
    estimated_hours: 4.0,
    notes: 'POSIX sockets API (socket, bind, listen, accept), non-blocking flags (O_NONBLOCK), edge-triggered epoll event loops, and HTTP/1.1 parsing. Source: nCally/Project-Based-Tutorials-in-C (https://github.com/nCally/Project-Based-Tutorials-in-C)',
  },
  {
    moduleIndex: 6,
    title: 'Module 7: Project Option B (Virtual Machine / Architecture): Build a CHIP-8 or LC-3 virtual computer emulator in C with CPU instruction cycle decoding',
    description: 'Pillar 3: Project-Driven Systems Programming in C',
    estimated_hours: 4.0,
    notes: 'Fetch-decode-execute cycle, opcode dispatch jump tables, memory registers, keypad input polling, and graphics framebuffers. Source: nCally/Project-Based-Tutorials-in-C (https://github.com/nCally/Project-Based-Tutorials-in-C)',
  },
  {
    moduleIndex: 6,
    title: 'Module 7: Project Option C (Key-Value Database): Build a simple persistent B-tree or append-only key-value store in pure C',
    description: 'Pillar 3: Project-Driven Systems Programming in C',
    estimated_hours: 3.0,
    notes: 'File disk storage formatting, binary serialization, indexing, in-memory cache, and crash recovery log. Source: nCally/Project-Based-Tutorials-in-C (https://github.com/nCally/Project-Based-Tutorials-in-C)',
  },
  {
    moduleIndex: 6,
    title: 'Module 7: Testing & Verification: Write unit tests in C (using Unity or CMocka) validating edge cases and memory bounds',
    description: 'Pillar 3: Project-Driven Systems Programming in C',
    estimated_hours: 1.0,
    notes: 'Automated unit test runner, fixture setup/teardown, mock function injection, and test coverage evaluation. Source: nCally/Project-Based-Tutorials-in-C (https://github.com/nCally/Project-Based-Tutorials-in-C)',
  },
  {
    moduleIndex: 6,
    title: 'Module 7: Documentation: Document the architecture, memory footprint, and benchmarks in a GitHub README',
    description: 'Pillar 3: Project-Driven Systems Programming in C',
    estimated_hours: 1.0,
    notes: 'Memory footprint profiling, throughput benchmarks (requests/second), architectural diagrams, and build instructions. Source: nCally/Project-Based-Tutorials-in-C (https://github.com/nCally/Project-Based-Tutorials-in-C)',
  },

  // Module 8 (5 items)
  {
    moduleIndex: 7,
    title: 'Module 8: Rapid-Fire Drill: Answer 50 standard embedded interview questions from imsunilvaghela/TheEmbeDEADInterview',
    description: 'All Pillars: Holistic Review & Technical Drills',
    estimated_hours: 2.0,
    notes: 'Technical explanations covering bootloaders, compiler stages, static vs dynamic libraries, IPC, and Linux signals. Source: TheEmbeDEADInterview (https://github.com/imsunilvaghela/TheEmbeDEADInterview)',
  },
  {
    moduleIndex: 7,
    title: 'Module 8: Circuit & Bus Protocol Interview Defense: Explain SPI vs I2C vs CAN electrical characteristics and troubleshooting steps',
    description: 'All Pillars: Holistic Review & Technical Drills',
    estimated_hours: 2.0,
    notes: 'Oscilloscope and logic analyzer decoding, voltage levels, noise immunity, max cable lengths, and termination resistors (120 ohm CAN). Source: theEmbeddedGeorge (https://github.com/theEmbeddedGeorge/theEmbeddedNewTestament)',
  },
  {
    moduleIndex: 7,
    title: 'Module 8: Live Coding Drill: Write a custom byte-level packet parser in C with CRC verification in under 30 minutes',
    description: 'All Pillars: Holistic Review & Technical Drills',
    estimated_hours: 1.5,
    notes: 'Parse serial packet frames: Header, Length, Payload, CRC-16 checksum, and End delimiter with error recovery. Source: srnvl/Embedded_SWE_Prep (https://github.com/srnvl/Embedded_SWE_Prep)',
  },
  {
    moduleIndex: 7,
    title: 'Module 8: Debugging Scenario Defense: Walk through resolving a hard fault exception (Bus Fault, Memory Management Fault, Usage Fault)',
    description: 'All Pillars: Holistic Review & Technical Drills',
    estimated_hours: 1.5,
    notes: 'Inspect Cortex-M fault registers (HFSR, CFSR, MMFAR, BFAR), stack frame unwinding on exception entry, and diagnosing null pointer dereferences. Source: theEmbeddedGeorge (https://github.com/theEmbeddedGeorge/theEmbeddedNewTestament)',
  },
  {
    moduleIndex: 7,
    title: 'Module 8: Tooling Fluency: Explain how to configure GDB breakpoints, watchpoints, examine registers, and inspect core dumps',
    description: 'All Pillars: Holistic Review & Technical Drills',
    estimated_hours: 2.0,
    notes: 'GDB commands (b, watch *addr, info registers, x/16xw, bt), JTAG/SWD OpenOCD hardware targets, and post-mortem analysis. Source: All 4 Repositories Combined',
  },
];

const CHILD_MODULE_TASKS = [
  {
    title: 'Embedded Curriculum: Module 1 - Embedded C Mastery & Bit Manipulation (11h)',
    notes: 'Pillar 1: Embedded C & Memory Architecture. Bit masking, Kernighan algorithm, storage classes, volatile, const pointers, memory layout.',
    time_estimate_minutes: 660,
  },
  {
    title: 'Embedded Curriculum: Module 2 - Low-Level Memory, Endianness & Structs (11h)',
    notes: 'Pillar 1: Embedded C & Memory Architecture. Endianness detection/conversion, pointer arithmetic, struct padding/alignment, custom libc functions.',
    time_estimate_minutes: 660,
  },
  {
    title: 'Embedded Curriculum: Module 3 - Hardware Peripherals & Bus Protocols (14h)',
    notes: 'Pillar 2: Bare-Metal Microcontroller Architecture & Protocols. GPIO, Timers, ADC/DAC, UART, SPI, I2C, CAN Bus, Cortex-M NVIC.',
    time_estimate_minutes: 840,
  },
  {
    title: 'Embedded Curriculum: Module 4 - Systems Project Track 1: Core Systems in C (14h)',
    notes: 'Pillar 3: Project-Driven Systems Programming in C. UNIX shell with pipes, heap memory allocator, lock-free ring buffer, table-driven FSM.',
    time_estimate_minutes: 840,
  },
  {
    title: 'Embedded Curriculum: Module 5 - RTOS Fundamentals & Concurrency (11h)',
    notes: 'Pillar 2: Bare-Metal Microcontroller Architecture & Protocols. Superloop vs preemptive kernels, RMS/EDF, semaphores, mutexes, priority inversion, FreeRTOS.',
    time_estimate_minutes: 660,
  },
  {
    title: 'Embedded Curriculum: Module 6 - Embedded Linux & Character Drivers (15h)',
    notes: 'Pillar 4: Embedded Linux & Device Drivers. U-Boot/Kernel/RootFS/DTS, Syscalls, IPC, LKMs, Character Device Drivers, Top/Bottom half IRQs, Yocto.',
    time_estimate_minutes: 900,
  },
  {
    title: 'Embedded Curriculum: Module 7 - Systems Project Track 2: Systems Capstone (13h)',
    notes: 'Pillar 3: Project-Driven Systems Programming in C. Non-blocking HTTP/TCP server, CHIP-8 / LC-3 emulator, or key-value store in C.',
    time_estimate_minutes: 780,
  },
  {
    title: 'Embedded Curriculum: Module 8 - Embedded Technical Interview Gauntlet (9h)',
    notes: 'All Pillars: Holistic Review. 50 embedded interview questions, bus electrical defenses, timed packet parser with CRC, Hard Fault resolution, GDB.',
    time_estimate_minutes: 540,
  },
];

async function run() {
  console.log(`Starting Embedded Curriculum Ingestion for user_id: ${targetUserId}`);

  // 1. Locate or Update Curricula matching 'Embedded Systems'
  const { data: matchedCurricula, error: currErr } = await supabase
    .from('curricula')
    .select('*')
    .eq('user_id', targetUserId)
    .ilike('title', '%embedded%');

  if (currErr) {
    console.error('Failed to query curricula:', currErr);
    process.exit(1);
  }

  let curriculaList = matchedCurricula || [];
  if (curriculaList.length === 0) {
    console.log('No existing embedded curriculum found. Locating Academic category...');
    const { data: cats } = await supabase
      .from('curriculum_categories')
      .select('id')
      .eq('user_id', targetUserId)
      .eq('title', 'Academic')
      .limit(1);

    const categoryId = cats?.[0]?.id || null;
    const { data: newCurr, error: insertCurrErr } = await supabase
      .from('curricula')
      .insert({
        user_id: targetUserId,
        category_id: categoryId,
        title: 'Embedded Systems & Firmware',
        description: 'A structured, project-driven curriculum for Embedded Software Engineering (SWE), Bare-Metal Firmware, and Embedded Linux synthesizing 4 community-vetted repositories.',
        estimated_hours: 98,
        position: 5,
      })
      .select();

    if (insertCurrErr) {
      console.error('Failed to create curriculum:', insertCurrErr);
      process.exit(1);
    }
    curriculaList = newCurr;
  } else {
    console.log(`Found ${curriculaList.length} matching curriculum record(s). Updating metadata...`);
    for (const curr of curriculaList) {
      const { error: updErr } = await supabase
        .from('curricula')
        .update({
          title: 'Embedded Systems & Firmware',
          description: 'A structured, project-driven curriculum for Embedded Software Engineering (SWE), Bare-Metal Firmware, and Embedded Linux synthesizing 4 community-vetted repositories.',
          estimated_hours: 98,
        })
        .eq('id', curr.id);

      if (updErr) {
        console.error(`Failed to update curriculum ${curr.id}:`, updErr);
      }
    }
  }

  // 2. Upsert the 8 Module Chapters in curriculum_chapters
  console.log('Upserting 8 Module Chapters into curriculum_chapters...');
  const chapterIdMap = {};

  for (let i = 0; i < MODULE_CHAPTERS.length; i++) {
    const ch = MODULE_CHAPTERS[i];
    const { data: existingCh } = await supabase
      .from('curriculum_chapters')
      .select('id')
      .eq('user_id', targetUserId)
      .eq('title', ch.title)
      .limit(1);

    if (existingCh && existingCh.length > 0) {
      chapterIdMap[i] = existingCh[0].id;
      await supabase
        .from('curriculum_chapters')
        .update({
          description: ch.description,
          node_title: ch.node_title,
          position: ch.position,
        })
        .eq('id', existingCh[0].id);
    } else {
      const { data: insertedCh, error: chInsErr } = await supabase
        .from('curriculum_chapters')
        .insert({
          user_id: targetUserId,
          title: ch.title,
          description: ch.description,
          node_title: ch.node_title,
          position: ch.position,
        })
        .select('id');

      if (chInsErr) {
        console.error(`Failed to insert chapter ${ch.title}:`, chInsErr);
        process.exit(1);
      }
      chapterIdMap[i] = insertedCh[0].id;
    }
  }
  console.log('Chapters synced successfully. IDs:', chapterIdMap);

  // 3. For each curriculum record, sync resources and topics
  for (const curr of curriculaList) {
    console.log(`Syncing resources and topics for curriculum ID: ${curr.id}...`);

    // Resources: delete and re-insert 4 verified sources
    await supabase.from('curriculum_resources').delete().eq('curriculum_id', curr.id);
    const resourceRows = CURRICULUM_RESOURCES.map(r => ({
      user_id: targetUserId,
      curriculum_id: curr.id,
      title: r.title,
      author: r.author,
      resource_type: r.resource_type,
      url: r.url,
      notes: r.notes,
    }));

    const { error: resErr } = await supabase.from('curriculum_resources').insert(resourceRows);
    if (resErr) {
      console.error(`Failed to insert resources for ${curr.id}:`, resErr);
      process.exit(1);
    }
    console.log(`Inserted ${resourceRows.length} resources for curriculum ${curr.id}.`);

    // Topics: delete old placeholder topics and insert 56 items
    await supabase.from('curriculum_topics').delete().eq('curriculum_id', curr.id);
    const topicRows = RAW_TOPICS.map((t, idx) => ({
      user_id: targetUserId,
      curriculum_id: curr.id,
      chapter_id: chapterIdMap[t.moduleIndex],
      title: t.title,
      description: t.description,
      status: 'not_started',
      position: idx,
      estimated_hours: t.estimated_hours,
      notes: t.notes,
      is_recommended_next: idx === 0,
    }));

    const { error: topErr } = await supabase.from('curriculum_topics').insert(topicRows);
    if (topErr) {
      console.error(`Failed to insert topics for ${curr.id}:`, topErr);
      process.exit(1);
    }
    console.log(`Inserted ${topicRows.length} topics for curriculum ${curr.id}.`);
  }

  // 4. Tasks: Ensure Matrix Protection is respected
  console.log('Checking / creating Matrix-Protected tasks...');
  const { data: existingParentTasks } = await supabase
    .from('tasks')
    .select('id')
    .eq('user_id', targetUserId)
    .eq('title', 'Embedded Systems & C Firmware Mastery')
    .limit(1);

  let parentTaskId = existingParentTasks?.[0]?.id;

  if (!parentTaskId) {
    console.log('Creating master parent container task...');
    const { data: parentInserted, error: pErr } = await supabase
      .from('tasks')
      .insert({
        user_id: targetUserId,
        title: 'Embedded Systems & C Firmware Mastery',
        category: 'academic',
        status: 'inbox',
        deadline: null,
        quadrant: null,
        time_estimate_minutes: 5880,
        estimated_minutes: 5880,
        mental_load: 'high',
        estimate_source: 'user',
        notes: 'Master container tracking the 8-module Embedded Systems learning path across 4 competency pillars (Embedded C, Bare-Metal Protocols, Systems Projects, and Embedded Linux). Synthesis of nCally, theEmbeddedGeorge, imsunilvaghela, and srnvl repositories.',
      })
      .select('id');

    if (pErr) {
      console.error('Failed to create parent task:', pErr);
      process.exit(1);
    }
    parentTaskId = parentInserted[0].id;
    console.log('Created parent task with ID:', parentTaskId);
  } else {
    console.log('Parent task already exists with ID:', parentTaskId);
  }

  // Check child tasks
  const { data: existingChildTasks } = await supabase
    .from('tasks')
    .select('id, title')
    .eq('user_id', targetUserId)
    .eq('parent_task_id', parentTaskId);

  const existingChildTitles = new Set((existingChildTasks || []).map(t => t.title));

  for (const child of CHILD_MODULE_TASKS) {
    if (!existingChildTitles.has(child.title)) {
      const { error: chErr } = await supabase.from('tasks').insert({
        user_id: targetUserId,
        parent_task_id: parentTaskId,
        title: child.title,
        notes: child.notes,
        category: 'academic',
        status: 'inbox',
        deadline: null,
        quadrant: null,
        time_estimate_minutes: child.time_estimate_minutes,
        estimated_minutes: child.time_estimate_minutes,
        mental_load: 'high',
        estimate_source: 'user',
      });

      if (chErr) {
        console.error(`Failed to create child task ${child.title}:`, chErr);
      } else {
        console.log(`Created child task: ${child.title}`);
      }
    } else {
      console.log(`Child task already exists: ${child.title}`);
    }
  }

  console.log('Embedded Systems & C Firmware Mastery ingestion completed successfully!');
}

run().catch((err) => {
  console.error('Unhandled fatal error in ingestion script:', err);
  process.exit(1);
});
