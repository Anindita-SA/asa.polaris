# Implementation Plan: Embedded Systems and C Firmware Mastery Curriculum Ingestion

This document establishes the end-to-end implementation and ingestion specification for the **Embedded Systems & C Firmware Mastery** curriculum into Polaris. It bridges foundational computer engineering concepts, bare-metal hardware protocols, systems programming in C, and embedded Linux device drivers into Polaris's curriculum, task triage, and database schema.

---

## 1. Executive Summary & Architecture

The Embedded Systems & C Firmware Mastery curriculum synthesizes four community-vetted open-source engineering resources into a 98-hour, 8-module, 56-task progressive roadmap.

### Source Repositories

1. **Project-Based Tutorials in C**
   * **Creator:** nCally
   * **Repository:** [https://github.com/nCally/Project-Based-Tutorials-in-C](https://github.com/nCally/Project-Based-Tutorials-in-C)
   * **Focus:** Systems software in pure C covering shells, memory allocators, network socket servers, virtual machine emulators, and table-driven state machines.
2. **theEmbeddedNewTestament**
   * **Creator:** George Li (theEmbeddedGeorge)
   * **Repository:** [https://github.com/theEmbeddedGeorge/theEmbeddedNewTestament](https://github.com/theEmbeddedGeorge/theEmbeddedNewTestament)
   * **Live Site:** [https://theembeddednewtestament.github.io/](https://theembeddednewtestament.github.io/)
   * **Focus:** Deep conceptual notes on microcontroller hardware, bus protocols (UART, SPI, I2C, CAN, USB), ARM Cortex-M NVIC interrupt handling, and debugging.
3. **TheEmbeDEADInterview**
   * **Creator:** Sunil Vaghela (imsunilvaghela)
   * **Repository:** [https://github.com/imsunilvaghela/TheEmbeDEADInterview](https://github.com/imsunilvaghela/TheEmbeDEADInterview)
   * **Focus:** Technical interview preparation for Embedded Linux, kernel architecture, character device drivers, POSIX IPC, FreeRTOS concurrency, and Yocto/Buildroot.
4. **Embedded_SWE_Prep**
   * **Creator:** srnvl
   * **Repository:** [https://github.com/srnvl/Embedded_SWE_Prep](https://github.com/srnvl/Embedded_SWE_Prep)
   * **Focus:** Embedded software coding drills, bit manipulation algorithms, runtime endianness detection/conversion, pointer arithmetic, and struct padding.

---

## 2. The 4 Competency Pillars

The curriculum is structured around four interlocking competency pillars:

```
+-------------------------------------------------------------------------------+
|                    EMBEDDED SYSTEMS MASTERY ARCHITECTURE                      |
+-------------------------------------------------------------------------------+
|                                                                               |
|  [Pillar 1] Embedded C & Memory       -> Bitwise, pointers, custom allocators |
|  [Pillar 2] Bare-Metal & Protocols    -> GPIO, Timers, UART/SPI/I2C/CAN, NVIC|
|  [Pillar 3] Project-Driven Systems    -> Shells, Network Sockets, Emulators   |
|  [Pillar 4] Embedded Linux & Drivers  -> Kernel Modules, Char Drivers, Yocto  |
|                                                                               |
+-------------------------------------------------------------------------------+
```

* **Pillar 1: Embedded C & Memory Architecture**
  Covers bitwise manipulation, volatile semantics, storage durations, pointer arithmetic, memory alignment, struct padding, and custom standard library routines.
* **Pillar 2: Bare-Metal Microcontroller Architecture & Protocols**
  Covers push-pull vs open-drain GPIO, analog interfacing (ADC/DAC), timers, PWM, peripheral protocols (UART, SPI, I2C, CAN), ARM Cortex-M NVIC, and FreeRTOS task scheduling.
* **Pillar 3: Project-Driven Systems Programming in C**
  Covers building systems software from scratch: UNIX shell with job control, heap memory allocators, lock-free ring buffers, socket servers, and virtual machine interpreters.
* **Pillar 4: Embedded Linux & Device Drivers**
  Covers U-Boot bootloader flow, Linux kernel space vs user space boundaries, character device drivers (`ioctl`, `read`, `write`), split interrupt handlers (top/bottom half), and cross-compilation toolchains.

---

## 3. The 8 Learning Modules & All 56 Checklist Items

Total Estimated Duration: **98 hours** across 8 modules.

### Module 1: Embedded C Mastery & Bit Manipulation
* **Competency Pillar:** Pillar 1 (Embedded C & Memory Architecture)
* **Primary Sources:** `Embedded_SWE_Prep` (srnvl) + `theEmbeddedNewTestament` (theEmbeddedGeorge)
* **Estimated Time:** 11 hours (range: 10-12 hours)
* **Checklist Items (9 items):**
  1. `M01-T01`: Bitwise Operations: Master bit masking, setting, clearing, toggling, and reading specific bits using macro idioms (1.5h, Recommended Next)
     * *Notes:* Practice register bit manipulation macros: `SET_BIT`, `CLEAR_BIT`, `TOGGLE_BIT`, `READ_BIT`. Repo: srnvl/Embedded_SWE_Prep.
  2. `M01-T02`: Bitwise Algorithms: Implement Brian Kernighan's algorithm to count set bits in C (1.0h)
     * *Notes:* Efficient O(k) set bit counting where k is number of set bits. Repo: srnvl/Embedded_SWE_Prep.
  3. `M01-T03`: Bitwise Algorithms: Find the only non-repeating number in an array using XOR logic (1.0h)
     * *Notes:* Exploit XOR cancellation properties (x ^ x = 0, x ^ 0 = x) for O(n) time and O(1) space. Repo: srnvl/Embedded_SWE_Prep.
  4. `M01-T04`: Bitwise Algorithms: Write functions to check power of 2 and reverse the bits of a 32-bit unsigned integer (1.0h)
     * *Notes:* Master `(n & (n - 1)) == 0` check and bit reversal via divide-and-conquer shifts. Repo: srnvl/Embedded_SWE_Prep.
  5. `M01-T05`: Keywords Deep Dive: Analyze the storage duration, scope, and linkage of `static`, `extern`, and `register` (1.5h)
     * *Notes:* Distinguish internal vs external linkage, file scope vs block scope, and compiler storage implications. Repo: theEmbeddedGeorge.
  6. `M01-T06`: Keywords Deep Dive: Master `volatile` (when to use in memory-mapped I/O, ISR variables, and multithreading flags) (1.5h)
     * *Notes:* Understand compiler optimization suppression, memory barriers, and volatile pointer declarations. Repo: theEmbeddedGeorge.
  7. `M01-T07`: Type Qualifiers: Understand `const` pointer variants (`const int *`, `int * const`, and `const int * const`) (1.0h)
     * *Notes:* Read clockwise-spiral rule to differentiate pointer to constant data vs constant pointer to mutable data. Repo: theEmbeddedGeorge.
  8. `M01-T08`: Memory Layout: Draw and explain the standard C memory layout (Text, Data, BSS, Heap, Stack) (1.0h)
     * *Notes:* Map global initialized variables, zero-initialized BSS, runtime stack frames, and dynamic heap growth. Repo: theEmbeddedGeorge.
  9. `M01-T09`: Practical Drill: Complete the Bit Manipulation problem set from `srnvl/Embedded_SWE_Prep` (1.5h)
     * *Notes:* Solve all practice exercises in bit manipulation section under timed conditions. Repo: srnvl/Embedded_SWE_Prep.

### Module 2: Low-Level Memory, Endianness & Struct Architecture
* **Competency Pillar:** Pillar 1 (Embedded C & Memory Architecture)
* **Primary Sources:** `Embedded_SWE_Prep` (srnvl) + `theEmbeddedNewTestament` (theEmbeddedGeorge)
* **Estimated Time:** 11 hours (range: 10-12 hours)
* **Checklist Items (8 items):**
  10. `M02-T01`: Endianness Detection: Write a C program to detect Big Endian vs Little Endian at runtime using pointers and unions (1.0h)
      * *Notes:* Compare multi-byte union memory representation and char pointer dereferencing of short int `0x0001`. Repo: srnvl/Embedded_SWE_Prep.
  11. `M02-T02`: Endianness Conversion: Write a fast byte-swap macro / function for 16-bit, 32-bit, and 64-bit integers (1.0h)
      * *Notes:* Implement byte-level shifts and compare against compiler builtins `__builtin_bswap32` and `htons`/`ntohl`. Repo: srnvl/Embedded_SWE_Prep.
  12. `M02-T03`: Pointer Arithmetic: Master void pointers, function pointers, and arrays of function pointers (jump tables) (1.5h)
      * *Notes:* Build dynamic jump tables for state dispatch and packet handlers. Repo: theEmbeddedGeorge.
  13. `M02-T04`: Struct Alignment: Calculate struct sizes with memory padding, alignment rules, and compiler `#pragma pack(1)` / `__attribute__((packed))` (1.5h)
      * *Notes:* Understand CPU word boundary access efficiency, padding penalty, and unaligned access traps. Repo: theEmbeddedGeorge.
  14. `M02-T05`: Standard Library Clones: Implement custom `memcpy()`, `memmove()` (handling overlapping memory), and `memset()` (2.0h)
      * *Notes:* Handle source and destination overlap in `memmove` by backward copying when `dest > src`. Repo: srnvl/Embedded_SWE_Prep.
  15. `M02-T06`: String Manipulation in C: Implement `my_strstr()`, `my_strcpy()`, and custom atoi without standard library dependencies (1.5h)
      * *Notes:* Safe zero-dependency string handling, integer overflow checks in atoi, and pointer increments. Repo: srnvl/Embedded_SWE_Prep.
  16. `M02-T07`: Linked Lists for Embedded: Implement an in-place singly linked list reversal and circular linked list in pure C (1.0h)
      * *Notes:* Master pointer manipulation with 3 pointers (prev, curr, next) and circular buffer link management. Repo: srnvl/Embedded_SWE_Prep.
  17. `M02-T08`: Practical Drill: Solve Flatten Multi-Level Linked List and Detect Endianness from `srnvl/Embedded_SWE_Prep` (1.5h)
      * *Notes:* Solve memory and pointer tracking questions from srnvl repository. Repo: srnvl/Embedded_SWE_Prep.

### Module 3: Microcontroller Hardware & Communication Protocols
* **Competency Pillar:** Pillar 2 (Bare-Metal Microcontroller Architecture & Protocols)
* **Primary Source:** `theEmbeddedNewTestament` (theEmbeddedGeorge)
* **Estimated Time:** 14 hours (range: 12-15 hours)
* **Checklist Items (9 items):**
  18. `M03-T01`: Hardware Fundamentals: Understand open-drain vs push-pull GPIO, pull-up/pull-down resistor calculations, and floating pins (1.5h)
      * *Notes:* Electrical circuit topologies, bus driving, leakage current, and safe pin termination. Repo: theEmbeddedGeorge.
  19. `M03-T02`: Analog Interfacing: ADC resolution, sampling rates, sample-and-hold circuits, and DAC basics (1.5h)
      * *Notes:* Quantization error, ENOB (effective number of bits), Nyquist criterion, and SAR vs Sigma-Delta ADCs. Repo: theEmbeddedGeorge.
  20. `M03-T03`: Timers & PWM: Clock prescalers, auto-reload registers, capture/compare channels, and PWM duty cycle control (1.5h)
      * *Notes:* Timer peripheral frequency calculations: `f_timer = f_clk / ((PSC + 1) * (ARR + 1))`. Repo: theEmbeddedGeorge.
  21. `M03-T04`: Protocol Deep Dive - UART: Baud rate generation, framing errors, parity, flow control (RTS/CTS), and ring buffer integration (1.5h)
      * *Notes:* Asynchronous serial framing: start bit, 8 data bits, parity, stop bits, and hardware flow control lines. Repo: theEmbeddedGeorge.
  22. `M03-T05`: Protocol Deep Dive - SPI: Master-Slave topology, CPOL and CPHA clock polarity modes, Chip Select timings, and DMA transfers (1.5h)
      * *Notes:* Analyze SPI Modes 0, 1, 2, 3 with timing diagrams, clock edge latching, and high-throughput DMA chaining. Repo: theEmbeddedGeorge.
  23. `M03-T06`: Protocol Deep Dive - I2C: 7-bit vs 10-bit addressing, Start/Stop conditions, ACK/NACK, clock stretching, and multi-master arbitration (1.5h)
      * *Notes:* Open-drain serial bus with wired-AND logic, bus capacitance limits, pull-up sizing, and collision detection. Repo: theEmbeddedGeorge.
  24. `M03-T07`: Protocol Deep Dive - CAN Bus: Differential signaling, CAN frame anatomy, bit stuffing, identifier priority arbitration, and fault confinement (2.0h)
      * *Notes:* Dominant vs recessive bits (CAN_H and CAN_L), 11-bit standard vs 29-bit extended frames, CRC delimiting, and error counters. Repo: theEmbeddedGeorge.
  25. `M03-T08`: Interrupt Architecture: ARM Cortex-M NVIC, interrupt vector tables, interrupt priorities, latency, and writing re-entrant ISRs (1.5h)
      * *Notes:* Priority grouping (preemption vs sub-priority), tail-chaining, late arriving interrupts, and ISR re-entrancy rules. Repo: theEmbeddedGeorge.
  26. `M03-T09`: Practical Drill: Review George Li's Communication Protocols interview summary sheets and notes (1.5h)
      * *Notes:* Study cheat sheets comparing UART vs SPI vs I2C vs CAN electrical and protocol differences. Repo: theEmbeddedGeorge.

### Module 4: Systems Project Track 1 - Core Systems in C
* **Competency Pillar:** Pillar 3 (Project-Driven Systems Programming in C)
* **Primary Source:** `Project-Based-Tutorials-in-C` (nCally)
* **Estimated Time:** 14 hours (range: 12-15 hours)
* **Checklist Items (5 items):**
  27. `M04-T01`: Build a Custom Shell: Create a UNIX shell in C with command parsing, `fork()`, `execvp()`, background jobs (`&`), and piping (`|`) (4.0h)
      * *Notes:* Process lifecycle, `waitpid()`, signal handling (SIGINT, SIGTSTP, SIGCHLD), file descriptor redirection with `dup2()`. Repo: nCally/Project-Based-Tutorials-in-C.
  28. `M04-T02`: Build a Memory Allocator: Implement a bare-bones `malloc()`, `calloc()`, and `free()` using `sbrk()` or memory blocks with linked-list chunk tracking (3.5h)
      * *Notes:* Implement block metadata headers, first-fit or best-fit search, chunk splitting, and coalescing free blocks. Repo: nCally/Project-Based-Tutorials-in-C.
  29. `M04-T03`: Build a Circular Buffer (Ring Buffer): Write a lock-free single-producer single-consumer circular buffer for UART data streaming (2.5h)
      * *Notes:* Modulo vs power-of-two mask indexing, head/tail pointers with atomic barriers, and overrun/underrun handling. Repo: nCally/Project-Based-Tutorials-in-C.
  30. `M04-T04`: Build a Finite State Machine (FSM): Implement a table-driven state machine in C using function pointers for embedded device control (2.0h)
      * *Notes:* 2D transition matrix `next_state = transition_table[current_state][event]`, state entry/exit actions, and event queues. Repo: nCally/Project-Based-Tutorials-in-C.
  31. `M04-T05`: Code Quality: Run GCC with `-Wall -Wextra -Werror -pedantic` and verify clean memory with Valgrind / AddressSanitizer (2.0h)
      * *Notes:* Strict compiler flag enforcement, memory leak audits, out-of-bounds checks, and undefined behavior elimination. Repo: nCally/Project-Based-Tutorials-in-C.

### Module 5: RTOS Fundamentals & Concurrency
* **Competency Pillar:** Pillar 2 (Bare-Metal Microcontroller Architecture & Protocols)
* **Primary Sources:** `TheEmbeDEADInterview` (imsunilvaghela) + `theEmbeddedNewTestament` (theEmbeddedGeorge)
* **Estimated Time:** 11 hours (range: 10-12 hours)
* **Checklist Items (7 items):**
  32. `M05-T01`: RTOS vs Bare-Metal: Superloop architecture vs preemptive scheduling trade-offs (1.5h)
      * *Notes:* Latency determinism, memory footprint overhead, context switch costs, and when a bare-metal state machine is superior. Repo: TheEmbeDEADInterview.
  33. `M05-T02`: Scheduling Algorithms: Rate Monotonic Scheduling (RMS), Earliest Deadline First (EDF), and Round Robin (1.5h)
      * *Notes:* Fixed-priority static scheduling bounds: utilization bound `U <= n(2^(1/n) - 1)` (~69.3%) vs dynamic EDF optimal utilization (100%). Repo: theEmbeddedGeorge.
  34. `M05-T03`: Synchronization Primitives: Mutex vs Counting Semaphore vs Binary Semaphore (1.5h)
      * *Notes:* Ownership semantics, recursive locks, signaling between ISR and task, and resource counting. Repo: theEmbeddedGeorge.
  35. `M05-T04`: Real-Time Hazards: Priority Inversion, Priority Inheritance, and Deadlock detection (Coffman conditions) (1.5h)
      * *Notes:* Mars Pathfinder incident case study, priority ceiling protocol vs priority inheritance, and breaking circular waits. Repo: TheEmbeDEADInterview.
  36. `M05-T05`: Inter-Task Communication: Message queues, event flags, task notifications, and shared memory (1.5h)
      * *Notes:* Pass-by-value vs pass-by-reference in FreeRTOS queues, lightweight direct-to-task notifications (30% faster than semaphores). Repo: theEmbeddedGeorge.
  37. `M05-T06`: Critical Sections: Disabling interrupts vs task locking vs spinlocks (1.5h)
      * *Notes:* `taskENTER_CRITICAL()` / `taskEXIT_CRITICAL()`, interrupt masking levels in Cortex-M `basepri`, and multi-core spinlock safety. Repo: TheEmbeDEADInterview.
  38. `M05-T07`: FreeRTOS Practice: Create a 2-task FreeRTOS project simulating a sensor reading task and an alert output task (2.0h)
      * *Notes:* Build practical task definitions, priority assignment, queue transmission, and idle hook verification. Repo: TheEmbeDEADInterview.

### Module 6: Embedded Linux, Kernel Internals & Device Drivers
* **Competency Pillar:** Pillar 4 (Embedded Linux & Device Drivers)
* **Primary Source:** `TheEmbeDEADInterview` (imsunilvaghela)
* **Estimated Time:** 15 hours (range: 14-16 hours)
* **Checklist Items (8 items):**
  39. `M06-T01`: Embedded Linux Architecture: Bootloader (U-Boot), Linux Kernel, Root Filesystem, and Device Tree (.dts/.dtsi) (2.0h)
      * *Notes:* ARM boot sequence: ROM code -> SPL -> U-Boot -> Kernel image + DTB -> init process (systemd/busybox). Repo: TheEmbeDEADInterview.
  40. `M06-T02`: Kernel Space vs User Space: Syscalls, virtual memory management, page tables, and context switching overhead (2.0h)
      * *Notes:* MMU page translation, TLB flushes, software interrupt / sysenter entry, user copy routines (`copy_to_user`, `copy_from_user`). Repo: TheEmbeDEADInterview.
  41. `M06-T03`: Inter-Process Communication (IPC): Pipes, Named FIFOs, POSIX Shared Memory, Message Queues, and UNIX Domain Sockets (2.0h)
      * *Notes:* Performance benchmarks, synchronization with semaphores, zero-copy shared memory vs kernel-buffered sockets. Repo: TheEmbeDEADInterview.
  42. `M06-T04`: Linux Kernel Module (LKM): Write, compile, and insert a "Hello World" kernel module using `insmod`, `rmmod`, and `dmesg` (2.0h)
      * *Notes:* Makefile with `KDIR`, `module_init()` and `module_exit()` macros, kernel print levels (`pr_info`, `KERN_ALERT`), and module licensing. Repo: TheEmbeDEADInterview.
  43. `M06-T05`: Character Device Driver: Build a character driver implementing `open()`, `release()`, `read()`, `write()`, and `ioctl()` (2.5h)
      * *Notes:* `struct file_operations`, major and minor device number allocation (`alloc_chrdev_region`), cdev initialization, and sysfs device node creation. Repo: TheEmbeDEADInterview.
  44. `M06-T06`: Interrupt Handling in Linux: Top half (hard ISR) vs Bottom half (Tasklets, Workqueues, Threaded IRQs) (1.5h)
      * *Notes:* Atomic top-half interrupt service routines vs deferred bottom-half execution in process context (workqueues) vs softirq context. Repo: TheEmbeDEADInterview.
  45. `M06-T07`: Build Systems & Cross-Compilation: Configure a cross-compile toolchain (`arm-none-eabi-gcc` or `arm-linux-gnueabihf-gcc`) (1.5h)
      * *Notes:* Sysroot configuration, target architecture flags (`-mcpu=cortex-a7`, `-mfloat-abi=hard`), and library linking. Repo: TheEmbeDEADInterview.
  46. `M06-T08`: Yocto / Buildroot Overview: Understand recipes, layers, bitbake targets, and generating custom minimal Linux images (1.5h)
      * *Notes:* Buildroot vs Yocto architectural comparison, BitBake recipe syntax (`do_compile`, `do_install`), machine configuration, and BSP layers. Repo: TheEmbeDEADInterview.

### Module 7: Systems Project Track 2 - Capstone Network or Architecture Project
* **Competency Pillar:** Pillar 3 (Project-Driven Systems Programming in C)
* **Primary Source:** `Project-Based-Tutorials-in-C` (nCally)
* **Estimated Time:** 13 hours (range: 12-15 hours)
* **Checklist Items (5 items):**
  47. `M07-T01`: Project Option A (Network Stack): Build a lightweight HTTP/TCP web server in C utilizing socket programming, non-blocking I/O, and `epoll()` (4.0h)
      * *Notes:* POSIX sockets API (`socket`, `bind`, `listen`, `accept`), non-blocking flags (`O_NONBLOCK`), edge-triggered epoll event loops, and HTTP/1.1 parsing. Repo: nCally/Project-Based-Tutorials-in-C.
  48. `M07-T02`: Project Option B (Virtual Machine / Architecture): Build a CHIP-8 or LC-3 virtual computer emulator in C with CPU instruction cycle decoding (4.0h)
      * *Notes:* Fetch-decode-execute cycle, opcode dispatch jump tables, memory registers, keypad input polling, and graphics framebuffers. Repo: nCally/Project-Based-Tutorials-in-C.
  49. `M07-T03`: Project Option C (Key-Value Database): Build a simple persistent B-tree or append-only key-value store in pure C (3.0h)
      * *Notes:* File disk storage formatting, binary serialization, indexing, in-memory cache, and crash recovery log. Repo: nCally/Project-Based-Tutorials-in-C.
  50. `M07-T04`: Testing & Verification: Write unit tests in C (using Unity or CMocka) validating edge cases and memory bounds (1.0h)
      * *Notes:* Automated unit test runner, fixture setup/teardown, mock function injection, and test coverage evaluation. Repo: nCally/Project-Based-Tutorials-in-C.
  51. `M07-T05`: Documentation: Document the architecture, memory footprint, and benchmarks in a GitHub README (1.0h)
      * *Notes:* Memory footprint profiling, throughput benchmarks (requests/second), architectural diagrams, and build instructions. Repo: nCally/Project-Based-Tutorials-in-C.

### Module 8: Embedded Interview Gauntlet & Technical Drills
* **Competency Pillar:** All Pillars (Holistic Review & Technical Drills)
* **Primary Source:** All 4 Repositories Combined
* **Estimated Time:** 9 hours (range: 8-10 hours)
* **Checklist Items (5 items):**
  52. `M08-T01`: Rapid-Fire Drill: Answer 50 standard embedded interview questions from `imsunilvaghela/TheEmbeDEADInterview` (2.0h)
      * *Notes:* Technical explanations covering bootloaders, compiler stages, static vs dynamic libraries, IPC, and Linux signals. Repo: TheEmbeDEADInterview.
  53. `M08-T02`: Circuit & Bus Protocol Interview Defense: Explain SPI vs I2C vs CAN electrical characteristics and troubleshooting steps (2.0h)
      * *Notes:* Oscilloscope and logic analyzer decoding, voltage levels, noise immunity, max cable lengths, and termination resistors (120 ohm CAN). Repo: theEmbeddedGeorge.
  54. `M08-T03`: Live Coding Drill: Write a custom byte-level packet parser in C with CRC verification in under 30 minutes (1.5h)
      * *Notes:* Parse serial packet frames: Header, Length, Payload, CRC-16 checksum, and End delimiter with error recovery. Repo: srnvl/Embedded_SWE_Prep.
  55. `M08-T04`: Debugging Scenario Defense: Walk through resolving a hard fault exception (Bus Fault, Memory Management Fault, Usage Fault) (1.5h)
      * *Notes:* Inspect Cortex-M fault registers (HFSR, CFSR, MMFAR, BFAR), stack frame unwinding on exception entry, and diagnosing null pointer dereferences. Repo: theEmbeddedGeorge.
  56. `M08-T05`: Tooling Fluency: Explain how to configure GDB breakpoints, watchpoints, examine registers, and inspect core dumps (2.0h)
      * *Notes:* GDB commands (`b`, `watch *addr`, `info registers`, `x/16xw`, `bt`), JTAG/SWD OpenOCD hardware targets, and post-mortem analysis. Repos: All 4 Sources.

---

## 4. Mapping to Polaris Schema

### A. Master Record: `curricula`
* **Table:** `curricula`
* **Category:** Academic (linked to `curriculum_categories` where title = 'Academic' and accent_color = '#8B5CF6')
* **Fields:**
  * `title`: `'Embedded Systems & C Firmware Mastery'`
  * `estimated_hours`: `98`
  * `description`: `'A progressive, project-driven curriculum synthesizing four community-vetted repositories (nCally, theEmbeddedGeorge, imsunilvaghela, and srnvl) spanning Embedded C & Memory, Bare-Metal Microcontroller Architecture & Protocols, Real-Time Operating Systems (FreeRTOS), Systems Programming in C, and Embedded Linux Device Drivers.'`
  * `position`: `1` (or matching order in Academic category)

### B. Source Repositories: `curriculum_resources`
Mapped directly into `curriculum_resources` table linked by `curriculum_id`:
1. **nCally / Project-Based-Tutorials-in-C**
   * `title`: `'Project-Based Tutorials in C'`
   * `author`: `'nCally'`
   * `resource_type`: `'course'`
   * `url`: `'https://github.com/nCally/Project-Based-Tutorials-in-C'`
   * `notes`: `'Hands-on C project tutorials covering Operating Systems, Computer Networking, Databases, and Architecture. Teaches practical C systems programming by building real software from scratch.'`
2. **theEmbeddedGeorge / theEmbeddedNewTestament**
   * `title`: `'theEmbeddedNewTestament'`
   * `author`: `'George Li (theEmbeddedGeorge)'`
   * `resource_type`: `'article'`
   * `url`: `'https://github.com/theEmbeddedGeorge/theEmbeddedNewTestament'`
   * `notes`: `'Deep conceptual notes on Hardware Fundamentals, Communication Protocols (I2C, SPI, UART, CAN, USB), Bus Protocols, Debugging (JTAG/SWD/GDB), Interrupts/NVIC, and Microcontroller Architecture. Live site: https://theembeddednewtestament.github.io/'`
3. **imsunilvaghela / TheEmbeDEADInterview**
   * `title`: `'TheEmbeDEADInterview'`
   * `author`: `'Sunil Vaghela (imsunilvaghela)'`
   * `resource_type`: `'article'`
   * `url`: `'https://github.com/imsunilvaghela/TheEmbeDEADInterview'`
   * `notes`: `'Technical interview prep specifically geared toward Embedded Linux, Linux Kernel internals, Character/Platform Device Drivers, IPC (Inter-Process Communication), Toolchains, and Yocto Project.'`
4. **srnvl / Embedded_SWE_Prep**
   * `title`: `'Embedded_SWE_Prep'`
   * `author`: `'srnvl'`
   * `resource_type`: `'article'`
   * `url`: `'https://github.com/srnvl/Embedded_SWE_Prep'`
   * `notes`: `'Embedded software coding problems, Grind 75 algorithmic patterns adapted for firmware, bit manipulation tricks, endianness detection, memory alignment, and struct padding.'`

### C. Learning Tracks: `curriculum_chapters`
Mapped into `curriculum_chapters` table, enabling chapter-level filtering and grouping:
1. `ch1`: `title`: `'Module 1: Embedded C Mastery & Bit Manipulation'`, `description`: `'Pillar 1: Embedded C & Memory Architecture (11h). Bit masking, Kernighan algorithm, storage classes, volatile, const pointers, memory layout.'`, `position`: `1`
2. `ch2`: `title`: `'Module 2: Low-Level Memory, Endianness & Struct Architecture'`, `description`: `'Pillar 1: Embedded C & Memory Architecture (11h). Endianness detection/conversion, pointer arithmetic, struct padding/alignment, custom libc functions.'`, `position`: `2`
3. `ch3`: `title`: `'Module 3: Microcontroller Hardware & Communication Protocols'`, `description`: `'Pillar 2: Bare-Metal & Protocols (14h). GPIO push-pull/open-drain, Timers/PWM, ADC/DAC, UART, SPI, I2C, CAN Bus, Cortex-M NVIC.'`, `position`: `3`
4. `ch4`: `title`: `'Module 4: Systems Project Track 1 - Core Systems in C'`, `description`: `'Pillar 3: Project-Driven Systems (14h). UNIX shell with pipes, heap memory allocator, lock-free ring buffer, table-driven FSM.'`, `position`: `4`
5. `ch5`: `title`: `'Module 5: RTOS Fundamentals & Concurrency'`, `description`: `'Pillar 2: Bare-Metal & Protocols (11h). Superloop vs preemptive kernels, RMS/EDF, semaphores, mutexes, priority inversion, FreeRTOS dual-task project.'`, `position`: `5`
6. `ch6`: `title`: `'Module 6: Embedded Linux, Kernel Internals & Device Drivers'`, `description`: `'Pillar 4: Embedded Linux & Drivers (15h). U-Boot/Kernel/RootFS/DTS, Syscalls, IPC, LKMs, Character Device Drivers, Top/Bottom half IRQs, Yocto.'`, `position`: `6`
7. `ch7`: `title`: `'Module 7: Systems Project Track 2 - Capstone Network or Architecture Project'`, `description`: `'Pillar 3: Project-Driven Systems (13h). Non-blocking HTTP/TCP server, CHIP-8 / LC-3 emulator, or key-value store in C.'`, `position`: `7`
8. `ch8`: `title`: `'Module 8: Embedded Interview Gauntlet & Technical Drills'`, `description`: `'All Pillars: Holistic Review (9h). 50 embedded interview questions, bus electrical defenses, timed packet parser with CRC, Hard Fault resolution, GDB.'`, `position`: `8`

### D. Syllabus Tasks: `curriculum_topics`
56 records in `curriculum_topics` table:
* Linked to `curriculum_id`
* Linked to corresponding `chapter_id`
* `status`: `'not_started'`
* `position`: `1` to `56`
* `is_recommended_next`: `true` for Topic 1 (`M01-T01`), `false` for remainder.
* `estimated_hours`: Numeric hours mapped to each individual topic (sum = 98.0 hours).
* `notes`: Includes citation to source repo, key concept summary, and drill instructions.

### E. Task Management & Matrix Protection: `tasks` Table
To honor Polaris's **Matrix Protection Discipline** and prevent flooding the active Day Guide matrix (which shows tasks with deadlines within 14 days or in active quadrants):
* All newly created curriculum tasks are inserted strictly in `inbox` status.
* `quadrant` is set to `null` (not in `urgent_important`, `important_not_urgent`, etc.).
* `deadline` is set to `null`.
* Tasks will only move to the Day Guide or Eisenhower matrix when deliberately triaged and scheduled by the user during weekly planning.

**Tasks Created:**
1. **Master Parent Container Task:**
   * `title`: `'Embedded Systems & C Firmware Mastery Curriculum (98h)'`
   * `status`: `'inbox'`
   * `quadrant`: `null`
   * `deadline`: `null`
   * `estimated_minutes`: `5880` (98 hours)
   * `estimate_source`: `'user'`
   * `notes`: `'Master container tracking the 8-module Embedded Systems learning path across 4 competency pillars (Embedded C, Bare-Metal Protocols, Systems Projects, and Embedded Linux). Synthesis of nCally, theEmbeddedGeorge, imsunilvaghela, and srnvl repositories.'`

2. **8 Child Module Container Tasks (All in Inbox):**
   * Task 1: `'Embedded Curriculum: Module 1 - Embedded C Mastery & Bit Manipulation (11h)'` (estimated_minutes: 660)
   * Task 2: `'Embedded Curriculum: Module 2 - Low-Level Memory, Endianness & Structs (11h)'` (estimated_minutes: 660)
   * Task 3: `'Embedded Curriculum: Module 3 - Hardware Peripherals & Bus Protocols (14h)'` (estimated_minutes: 840)
   * Task 4: `'Embedded Curriculum: Module 4 - Systems Project Track 1: Core Systems in C (14h)'` (estimated_minutes: 840)
   * Task 5: `'Embedded Curriculum: Module 5 - RTOS Fundamentals & Concurrency (11h)'` (estimated_minutes: 660)
   * Task 6: `'Embedded Curriculum: Module 6 - Embedded Linux & Character Drivers (15h)'` (estimated_minutes: 900)
   * Task 7: `'Embedded Curriculum: Module 7 - Systems Project Track 2: Systems Capstone (13h)'` (estimated_minutes: 780)
   * Task 8: `'Embedded Curriculum: Module 8 - Embedded Technical Interview Gauntlet (9h)'` (estimated_minutes: 540)

---

## 5. Seed Data Implementation (`src/data/curriculumDefaults.js`)

In `src/data/curriculumDefaults.js`, the `Embedded Systems & Firmware` entry in `SEED_CURRICULA` is updated to replace the 40-hour stub with the complete 98-hour synthesized curriculum:

```javascript
  {
    category: 'Academic',
    title: 'Embedded Systems & C Firmware Mastery',
    estimated_hours: 98,
    description: 'A progressive, project-driven curriculum synthesizing four community-vetted repositories (nCally, theEmbeddedGeorge, imsunilvaghela, and srnvl) spanning Embedded C & Memory, Bare-Metal Microcontroller Architecture & Protocols, Real-Time Operating Systems (FreeRTOS), Systems Programming in C, and Embedded Linux Device Drivers.',
    topics: [
      // Module 1: Embedded C Mastery & Bit Manipulation (11h)
      { title: 'Bitwise Operations: Master bit masking, setting, clearing, toggling, and reading bits', estimated_hours: 1.5, is_recommended_next: true, module: 1, notes: 'Macro idioms: SET_BIT, CLEAR_BIT, TOGGLE_BIT, READ_BIT. Source: srnvl/Embedded_SWE_Prep' },
      { title: 'Bitwise Algorithms: Implement Brian Kernighan algorithm to count set bits in C', estimated_hours: 1.0, module: 1, notes: 'Count set bits in O(k) time. Source: srnvl/Embedded_SWE_Prep' },
      { title: 'Bitwise Algorithms: Find the only non-repeating number in an array using XOR logic', estimated_hours: 1.0, module: 1, notes: 'XOR logic cancellation properties. Source: srnvl/Embedded_SWE_Prep' },
      { title: 'Bitwise Algorithms: Check power of 2 and reverse bits of 32-bit unsigned integer', estimated_hours: 1.0, module: 1, notes: 'Check power of 2 and bit reversal via shift operations. Source: srnvl/Embedded_SWE_Prep' },
      { title: 'Keywords Deep Dive: Storage duration, scope, and linkage of static, extern, register', estimated_hours: 1.5, module: 1, notes: 'Internal vs external linkage, file scope vs block scope. Source: theEmbeddedGeorge' },
      { title: 'Keywords Deep Dive: Master volatile in memory-mapped I/O, ISR variables, flags', estimated_hours: 1.5, module: 1, notes: 'Compiler optimization suppression and memory barriers. Source: theEmbeddedGeorge' },
      { title: 'Type Qualifiers: Master const pointer variants (const int*, int* const, const int* const)', estimated_hours: 1.0, module: 1, notes: 'Pointer to constant data vs constant pointer to mutable data. Source: theEmbeddedGeorge' },
      { title: 'Memory Layout: Draw and explain standard C memory layout (Text, Data, BSS, Heap, Stack)', estimated_hours: 1.0, module: 1, notes: 'Global initialized, zero-initialized BSS, runtime stack frames. Source: theEmbeddedGeorge' },
      { title: 'Practical Drill: Complete Bit Manipulation problem set from srnvl/Embedded_SWE_Prep', estimated_hours: 1.5, module: 1, notes: 'Hands-on bit manipulation problem set. Source: srnvl/Embedded_SWE_Prep' },

      // Module 2: Low-Level Memory, Endianness & Struct Architecture (11h)
      { title: 'Endianness Detection: Runtime Big Endian vs Little Endian detection via pointers and unions', estimated_hours: 1.0, module: 2, notes: 'Multi-byte union memory representation. Source: srnvl/Embedded_SWE_Prep' },
      { title: 'Endianness Conversion: Fast byte-swap macro / function for 16-bit, 32-bit, 64-bit integers', estimated_hours: 1.0, module: 2, notes: 'Byte-level shifts and compiler builtins. Source: srnvl/Embedded_SWE_Prep' },
      { title: 'Pointer Arithmetic: Master void pointers, function pointers, and function pointer arrays', estimated_hours: 1.5, module: 2, notes: 'Dynamic jump tables and state dispatch. Source: theEmbeddedGeorge' },
      { title: 'Struct Alignment: Struct padding, alignment rules, and compiler pragma pack / attribute packed', estimated_hours: 1.5, module: 2, notes: 'Word boundary alignment and unaligned access traps. Source: theEmbeddedGeorge' },
      { title: 'Standard Library Clones: Implement custom memcpy, memmove (with overlap), and memset', estimated_hours: 2.0, module: 2, notes: 'Memory buffer copying with backward copy overlap protection. Source: srnvl/Embedded_SWE_Prep' },
      { title: 'String Manipulation in C: Implement my_strstr, my_strcpy, and atoi without libc', estimated_hours: 1.5, module: 2, notes: 'Safe zero-dependency string functions. Source: srnvl/Embedded_SWE_Prep' },
      { title: 'Linked Lists for Embedded: In-place singly linked list reversal and circular linked list', estimated_hours: 1.0, module: 2, notes: 'In-place pointer reversal and circular lists. Source: srnvl/Embedded_SWE_Prep' },
      { title: 'Practical Drill: Solve Flatten Multi-Level List and Detect Endianness from srnvl', estimated_hours: 1.5, module: 2, notes: 'Memory and pointer tracking drills. Source: srnvl/Embedded_SWE_Prep' },

      // Module 3: Microcontroller Hardware & Communication Protocols (14h)
      { title: 'Hardware Fundamentals: Open-drain vs push-pull GPIO, pull-up/down resistors, floating pins', estimated_hours: 1.5, module: 3, notes: 'Electrical characteristics and circuit topologies. Source: theEmbeddedGeorge' },
      { title: 'Analog Interfacing: ADC resolution, sampling rates, sample-and-hold circuits, DAC basics', estimated_hours: 1.5, module: 3, notes: 'Quantization error, ENOB, and Nyquist rate. Source: theEmbeddedGeorge' },
      { title: 'Timers & PWM: Clock prescalers, auto-reload registers, capture/compare, PWM duty cycle', estimated_hours: 1.5, module: 3, notes: 'Timer frequency and duty cycle math. Source: theEmbeddedGeorge' },
      { title: 'Protocol Deep Dive - UART: Baud rate generation, framing errors, parity, flow control, ring buffers', estimated_hours: 1.5, module: 3, notes: 'Asynchronous serial transmission and RTS/CTS flow control. Source: theEmbeddedGeorge' },
      { title: 'Protocol Deep Dive - SPI: Master-Slave topology, CPOL/CPHA clock polarity modes, CS, DMA', estimated_hours: 1.5, module: 3, notes: 'SPI Modes 0-3 with timing diagrams and DMA transfers. Source: theEmbeddedGeorge' },
      { title: 'Protocol Deep Dive - I2C: 7-bit/10-bit addressing, Start/Stop, ACK/NACK, clock stretching, arbitration', estimated_hours: 1.5, module: 3, notes: 'Wired-AND logic, bus capacitance, and pull-up sizing. Source: theEmbeddedGeorge' },
      { title: 'Protocol Deep Dive - CAN Bus: Differential signaling, frame anatomy, bit stuffing, arbitration', estimated_hours: 2.0, module: 3, notes: 'CAN_H/CAN_L dominant vs recessive, standard/extended frames. Source: theEmbeddedGeorge' },
      { title: 'Interrupt Architecture: ARM Cortex-M NVIC, vector tables, priorities, latency, re-entrant ISRs', estimated_hours: 1.5, module: 3, notes: 'Preemption priority, sub-priority, and tail-chaining. Source: theEmbeddedGeorge' },
      { title: 'Practical Drill: Review George Li Communication Protocols interview summary sheets', estimated_hours: 1.5, module: 3, notes: 'Protocol comparison and defense notes. Source: theEmbeddedGeorge' },

      // Module 4: Systems Project Track 1 - Core Systems in C (14h)
      { title: 'Build a Custom Shell: UNIX shell in C with command parsing, fork, execvp, jobs, piping', estimated_hours: 4.0, module: 4, notes: 'Process lifecycle, waitpid, dup2 redirection, and signal handling. Source: nCally/Project-Based-Tutorials-in-C' },
      { title: 'Build a Memory Allocator: Bare-bones malloc, calloc, and free using sbrk and linked blocks', estimated_hours: 3.5, module: 4, notes: 'Chunk tracking, first-fit allocation, and block coalescing. Source: nCally/Project-Based-Tutorials-in-C' },
      { title: 'Build a Circular Buffer (Ring Buffer): Lock-free SPSC circular buffer for UART data streaming', estimated_hours: 2.5, module: 4, notes: 'Atomic memory barriers and head/tail index masks. Source: nCally/Project-Based-Tutorials-in-C' },
      { title: 'Build a Finite State Machine (FSM): Table-driven state machine in C using function pointers', estimated_hours: 2.0, module: 4, notes: 'Transition matrix and state action handlers. Source: nCally/Project-Based-Tutorials-in-C' },
      { title: 'Code Quality: Run GCC with -Wall -Wextra -Werror -pedantic and verify clean memory with Valgrind', estimated_hours: 2.0, module: 4, notes: 'Zero memory leaks and undefined behavior verification. Source: nCally/Project-Based-Tutorials-in-C' },

      // Module 5: RTOS Fundamentals & Concurrency (11h)
      { title: 'RTOS vs Bare-Metal: Superloop architecture vs preemptive scheduling trade-offs', estimated_hours: 1.5, module: 5, notes: 'Deterministic latency vs memory footprint. Source: TheEmbeDEADInterview' },
      { title: 'Scheduling Algorithms: Rate Monotonic Scheduling (RMS), EDF, and Round Robin', estimated_hours: 1.5, module: 5, notes: 'Static RMS utilization bound vs dynamic EDF. Source: theEmbeddedGeorge' },
      { title: 'Synchronization Primitives: Mutex vs Counting Semaphore vs Binary Semaphore', estimated_hours: 1.5, module: 5, notes: 'Lock ownership semantics and ISR signaling. Source: theEmbeddedGeorge' },
      { title: 'Real-Time Hazards: Priority Inversion, Priority Inheritance, and Deadlock detection', estimated_hours: 1.5, module: 5, notes: 'Mars Pathfinder case study and Coffman conditions. Source: TheEmbeDEADInterview' },
      { title: 'Inter-Task Communication: Message queues, event flags, task notifications, shared memory', estimated_hours: 1.5, module: 5, notes: 'Pass-by-value queue vs direct-to-task notifications. Source: theEmbeddedGeorge' },
      { title: 'Critical Sections: Disabling interrupts vs task locking vs spinlocks', estimated_hours: 1.5, module: 5, notes: 'taskENTER_CRITICAL and Cortex-M basepri masking. Source: TheEmbeDEADInterview' },
      { title: 'FreeRTOS Practice: Create 2-task FreeRTOS project simulating sensor reader and alert task', estimated_hours: 2.0, module: 5, notes: 'Queue passing and task priorities in FreeRTOS. Source: TheEmbeDEADInterview' },

      // Module 6: Embedded Linux, Kernel Internals & Device Drivers (15h)
      { title: 'Embedded Linux Architecture: Bootloader (U-Boot), Linux Kernel, RootFS, and Device Tree', estimated_hours: 2.0, module: 6, notes: 'ROM -> SPL -> U-Boot -> Kernel -> init process. Source: TheEmbeDEADInterview' },
      { title: 'Kernel Space vs User Space: Syscalls, virtual memory, page tables, context switch overhead', estimated_hours: 2.0, module: 6, notes: 'MMU page translation, TLB flushes, copy_to_user. Source: TheEmbeDEADInterview' },
      { title: 'Inter-Process Communication: Pipes, Named FIFOs, POSIX Shared Memory, Message Queues, Sockets', estimated_hours: 2.0, module: 6, notes: 'IPC mechanism comparison and synchronization. Source: TheEmbeDEADInterview' },
      { title: 'Linux Kernel Module (LKM): Write, compile, and insert Hello World module (insmod/rmmod/dmesg)', estimated_hours: 2.0, module: 6, notes: 'Kernel build system, module_init, and printk levels. Source: TheEmbeDEADInterview' },
      { title: 'Character Device Driver: Build character driver with open, release, read, write, ioctl', estimated_hours: 2.5, module: 6, notes: 'file_operations struct and cdev device nodes. Source: TheEmbeDEADInterview' },
      { title: 'Interrupt Handling in Linux: Top half (hard ISR) vs Bottom half (Tasklets, Workqueues, IRQs)', estimated_hours: 1.5, module: 6, notes: 'Atomic ISR vs deferred workqueue thread context. Source: TheEmbeDEADInterview' },
      { title: 'Build Systems & Cross-Compilation: Configure cross-compile toolchain (arm-none-eabi/linux-gnueabi)', estimated_hours: 1.5, module: 6, notes: 'Sysroot setup and target architecture flags. Source: TheEmbeDEADInterview' },
      { title: 'Yocto / Buildroot Overview: Recipes, layers, bitbake targets, and minimal Linux images', estimated_hours: 1.5, module: 6, notes: 'BitBake recipes, layers, and minimal rootfs images. Source: TheEmbeDEADInterview' },

      // Module 7: Systems Project Track 2 - Capstone Network or Architecture Project (13h)
      { title: 'Project Option A (Network Stack): Lightweight HTTP/TCP web server in C with non-blocking epoll', estimated_hours: 4.0, module: 7, notes: 'Socket programming, non-blocking I/O, epoll event loops. Source: nCally/Project-Based-Tutorials-in-C' },
      { title: 'Project Option B (Virtual Machine / Architecture): CHIP-8 or LC-3 computer emulator in C', estimated_hours: 4.0, module: 7, notes: 'CPU opcode decoding, virtual registers, instruction cycles. Source: nCally/Project-Based-Tutorials-in-C' },
      { title: 'Project Option C (Key-Value Database): Persistent B-tree or append-only key-value store in pure C', estimated_hours: 3.0, module: 7, notes: 'Disk serialization, file indexing, and data persistence. Source: nCally/Project-Based-Tutorials-in-C' },
      { title: 'Testing & Verification: Write unit tests in C (Unity or CMocka) validating memory bounds', estimated_hours: 1.0, module: 7, notes: 'Automated test suites and boundary conditions. Source: nCally/Project-Based-Tutorials-in-C' },
      { title: 'Documentation: Document architecture, memory footprint, and benchmarks in GitHub README', estimated_hours: 1.0, module: 7, notes: 'Benchmarking and memory footprint profiling. Source: nCally/Project-Based-Tutorials-in-C' },

      // Module 8: Embedded Interview Gauntlet & Technical Drills (9h)
      { title: 'Rapid-Fire Drill: Answer 50 standard embedded interview questions from TheEmbeDEADInterview', estimated_hours: 2.0, module: 8, notes: 'Core conceptual interview review questions. Source: TheEmbeDEADInterview' },
      { title: 'Circuit & Bus Protocol Defense: Explain SPI vs I2C vs CAN electrical characteristics', estimated_hours: 2.0, module: 8, notes: 'Signal analysis, termination resistors, and troubleshooting. Source: theEmbeddedGeorge' },
      { title: 'Live Coding Drill: Write custom byte-level packet parser in C with CRC verification (< 30 min)', estimated_hours: 1.5, module: 8, notes: 'Fast timed packet framing and CRC verification. Source: srnvl/Embedded_SWE_Prep' },
      { title: 'Debugging Scenario Defense: Walk through resolving Hard Fault exception (CFSR, MMFAR, BFAR)', estimated_hours: 1.5, module: 8, notes: 'Cortex-M fault registers and stack unwinding. Source: theEmbeddedGeorge' },
      { title: 'Tooling Fluency: Configure GDB breakpoints, watchpoints, inspect registers, examine core dumps', estimated_hours: 2.0, module: 8, notes: 'GDB debugging commands, watchpoints, and core analysis. Source: All 4 Sources' },
    ],
    resources: [
      {
        title: 'Project-Based Tutorials in C',
        author: 'nCally',
        resource_type: 'course',
        url: 'https://github.com/nCally/Project-Based-Tutorials-in-C',
        notes: 'Hands-on C project tutorials covering Operating Systems, Computer Networking, Databases, and Architecture.',
      },
      {
        title: 'theEmbeddedNewTestament',
        author: 'George Li (theEmbeddedGeorge)',
        resource_type: 'article',
        url: 'https://github.com/theEmbeddedGeorge/theEmbeddedNewTestament',
        notes: 'Hardware fundamentals, communication protocols (I2C, SPI, UART, CAN, USB), Cortex-M NVIC, and debugging. Live site: https://theembeddednewtestament.github.io/',
      },
      {
        title: 'TheEmbeDEADInterview',
        author: 'Sunil Vaghela (imsunilvaghela)',
        resource_type: 'article',
        url: 'https://github.com/imsunilvaghela/TheEmbeDEADInterview',
        notes: 'Technical interview prep for Embedded Linux, Linux Kernel internals, Character Drivers, IPC, and FreeRTOS.',
      },
      {
        title: 'Embedded_SWE_Prep',
        author: 'srnvl',
        resource_type: 'article',
        url: 'https://github.com/srnvl/Embedded_SWE_Prep',
        notes: 'Embedded coding drills, bit manipulation tricks, endianness detection, and struct padding.',
      },
    ],
  },
```

---

## 6. UI Component Enhancements (`src/components/curriculum/CurriculumView.jsx`)

When viewing the Embedded Systems curriculum, `CurriculumView.jsx` provides customized, high-information cards calibrated to the engineering curriculum:

### Detection Logic
```javascript
const isEmbeddedCurriculum = Boolean(
  curriculum?.title?.toLowerCase()?.includes('embedded')
)
```

### Visual Specifications (Dark Void Theme + Solid Amber Accents, NO Gradients)
All UI additions use Polaris solid glass styling without CSS gradients (`bg-gradient-to-...` is strictly forbidden).

#### 1. The 4 Competency Pillars Dashboard Card
* Placed above the syllabus when `isEmbeddedCurriculum` is true.
* Glass container with subtle amber border: `glass border border-amber-500/30 bg-amber-500/5 p-4 rounded-xl space-y-3`.
* Displays a 2x2 grid (or 4-column responsive grid on desktop):
  * **Pillar 1: Embedded C & Memory:** Solid border `border-amber-500/20 bg-void/60`. Focus: Bitwise, pointers, custom allocators, struct alignment.
  * **Pillar 2: Bare-Metal & Protocols:** Solid border `border-amber-500/20 bg-void/60`. Focus: GPIO, Timers, UART/SPI/I2C/CAN, NVIC, FreeRTOS.
  * **Pillar 3: Project-Driven Systems:** Solid border `border-amber-500/20 bg-void/60`. Focus: Custom Shell, Memory Allocator, Non-blocking Web Server, Emulators.
  * **Pillar 4: Embedded Linux & Drivers:** Solid border `border-amber-500/20 bg-void/60`. Focus: Kernel Modules, Char Drivers, IPC, Cross-compilation, Yocto.

#### 2. Source Repositories Quick Links Card
* Shows 4 clean cards linking directly to the verified repositories:
  * `nCally / Project-Based-Tutorials-in-C`
  * `George Li / theEmbeddedNewTestament` (with badge for Live Site)
  * `Sunil Vaghela / TheEmbeDEADInterview`
  * `srnvl / Embedded_SWE_Prep`
* Each card includes the repository title, maintainer handle, focus badge, and 1-click external link icon.

#### 3. 8-Module Pill Filter (Module Navigator)
* Provides instant horizontal pill navigation above the syllabus topics:
  * `All Modules (56)`
  * `M1: Bitwise & C (9)`
  * `M2: Memory & Structs (8)`
  * `M3: Hardware & Protocols (9)`
  * `M4: Systems Track 1 (5)`
  * `M5: RTOS & Concurrency (7)`
  * `M6: Embedded Linux (8)`
  * `M7: Capstone Project (5)`
  * `M8: Interview Gauntlet (5)`
* Active pill: `bg-amber-500/20 text-amber-300 border border-amber-500/50 font-mono text-xs px-2.5 py-1 rounded-lg`
* Inactive pill: `bg-void/60 text-nova/60 border border-pulsar/30 hover:text-starlight hover:border-amber-500/30 font-mono text-xs px-2.5 py-1 rounded-lg transition-colors`
* Filtering dynamically slices `topics` without reloading, allowing focused study sessions on single modules.

---

## 7. SQL Ingestion Script (`supabase/seed_embedded_curriculum.sql`)

An idempotent SQL script executes within Supabase to ingest the curriculum for existing users:

```sql
-- ============================================================================
-- POLARIS: Embedded Systems & C Firmware Mastery Curriculum Seed Script
-- ============================================================================

DO $$
DECLARE
    target_user_id uuid := '6c5ad880-f58d-4869-a672-6f75d566ca0d'; -- Target user ID
    acad_cat_id uuid;
    curr_id uuid;
    
    -- Chapter IDs
    ch1_id uuid := gen_random_uuid();
    ch2_id uuid := gen_random_uuid();
    ch3_id uuid := gen_random_uuid();
    ch4_id uuid := gen_random_uuid();
    ch5_id uuid := gen_random_uuid();
    ch6_id uuid := gen_random_uuid();
    ch7_id uuid := gen_random_uuid();
    ch8_id uuid := gen_random_uuid();

    -- Task IDs
    parent_task_id uuid := gen_random_uuid();
BEGIN
    -- 1. Locate Academic Category
    SELECT id INTO acad_cat_id 
    FROM curriculum_categories 
    WHERE user_id = target_user_id AND title = 'Academic'
    LIMIT 1;

    IF acad_cat_id IS NULL THEN
        acad_cat_id := gen_random_uuid();
        INSERT INTO curriculum_categories (id, user_id, title, accent_color, position)
        VALUES (acad_cat_id, target_user_id, 'Academic', '#8B5CF6', 1);
    END IF;

    -- 2. Check if curriculum already exists, otherwise insert
    SELECT id INTO curr_id
    FROM curricula
    WHERE user_id = target_user_id AND (title ILIKE '%Embedded Systems%' OR title ILIKE '%Firmware%')
    LIMIT 1;

    IF curr_id IS NULL THEN
        curr_id := gen_random_uuid();
        INSERT INTO curricula (id, user_id, category_id, title, description, estimated_hours, position)
        VALUES (
            curr_id,
            target_user_id,
            acad_cat_id,
            'Embedded Systems & C Firmware Mastery',
            'A progressive, project-driven curriculum synthesizing four community-vetted repositories (nCally, theEmbeddedGeorge, imsunilvaghela, and srnvl) spanning Embedded C & Memory, Bare-Metal Microcontroller Architecture & Protocols, Real-Time Operating Systems (FreeRTOS), Systems Programming in C, and Embedded Linux Device Drivers.',
            98,
            1
        );
    ELSE
        UPDATE curricula
        SET title = 'Embedded Systems & C Firmware Mastery',
            description = 'A progressive, project-driven curriculum synthesizing four community-vetted repositories (nCally, theEmbeddedGeorge, imsunilvaghela, and srnvl) spanning Embedded C & Memory, Bare-Metal Microcontroller Architecture & Protocols, Real-Time Operating Systems (FreeRTOS), Systems Programming in C, and Embedded Linux Device Drivers.',
            estimated_hours = 98
        WHERE id = curr_id;

        -- Clean up existing topics and resources for a fresh sync
        DELETE FROM curriculum_topics WHERE curriculum_id = curr_id;
        DELETE FROM curriculum_resources WHERE curriculum_id = curr_id;
    END IF;

    -- 3. Insert the 8 Chapters
    INSERT INTO curriculum_chapters (id, user_id, title, description, position) VALUES
    (ch1_id, target_user_id, 'Module 1: Embedded C Mastery & Bit Manipulation', 'Pillar 1: Embedded C & Memory. 10-12 hours (~11h). Bit masking, Kernighan algorithm, storage classes, volatile, const pointers, memory layout.', 1),
    (ch2_id, target_user_id, 'Module 2: Low-Level Memory, Endianness & Struct Architecture', 'Pillar 1: Embedded C & Memory. 10-12 hours (~11h). Endianness detection/conversion, pointer arithmetic, struct padding/alignment, custom libc functions.', 2),
    (ch3_id, target_user_id, 'Module 3: Microcontroller Hardware & Communication Protocols', 'Pillar 2: Bare-Metal & Protocols. 12-15 hours (~14h). GPIO push-pull/open-drain, Timers/PWM, ADC/DAC, UART, SPI, I2C, CAN Bus, Cortex-M NVIC.', 3),
    (ch4_id, target_user_id, 'Module 4: Systems Project Track 1 - Core Systems in C', 'Pillar 3: Project-Driven Systems. 12-15 hours (~14h). UNIX shell with pipes, heap memory allocator, lock-free ring buffer, table-driven FSM.', 4),
    (ch5_id, target_user_id, 'Module 5: RTOS Fundamentals & Concurrency', 'Pillar 2: Bare-Metal & Protocols. 10-12 hours (~11h). Superloop vs preemptive kernels, RMS/EDF, semaphores, mutexes, priority inversion, FreeRTOS dual-task project.', 5),
    (ch6_id, target_user_id, 'Module 6: Embedded Linux, Kernel Internals & Device Drivers', 'Pillar 4: Embedded Linux & Drivers. 14-16 hours (~15h). U-Boot/Kernel/RootFS/DTS, Syscalls, IPC, LKMs, Character Device Drivers, Top/Bottom half IRQs, Yocto.', 6),
    (ch7_id, target_user_id, 'Module 7: Systems Project Track 2 - Capstone Network or Architecture Project', 'Pillar 3: Project-Driven Systems. 12-15 hours (~13h). Non-blocking HTTP/TCP server, CHIP-8 / LC-3 emulator, or key-value store in C.', 7),
    (ch8_id, target_user_id, 'Module 8: Embedded Interview Gauntlet & Technical Drills', 'All Pillars: Holistic Review. 8-10 hours (~9h). 50 embedded interview questions, bus electrical defenses, timed packet parser with CRC, Hard Fault resolution, GDB.', 8);

    -- 4. Insert the 4 Curated Resources
    INSERT INTO curriculum_resources (id, user_id, curriculum_id, title, author, resource_type, url, notes) VALUES
    (gen_random_uuid(), target_user_id, curr_id, 'Project-Based Tutorials in C', 'nCally', 'course', 'https://github.com/nCally/Project-Based-Tutorials-in-C', 'Hands-on C project tutorials covering Operating Systems, Computer Networking, Databases, and Architecture. Teaches practical C systems programming by building real software from scratch.'),
    (gen_random_uuid(), target_user_id, curr_id, 'theEmbeddedNewTestament', 'George Li (theEmbeddedGeorge)', 'article', 'https://github.com/theEmbeddedGeorge/theEmbeddedNewTestament', 'Deep conceptual notes on Hardware Fundamentals, Communication Protocols (I2C, SPI, UART, CAN, USB), Bus Protocols, Debugging (JTAG/SWD/GDB), Interrupts/NVIC, and Microcontroller Architecture. Live site: https://theembeddednewtestament.github.io/'),
    (gen_random_uuid(), target_user_id, curr_id, 'TheEmbeDEADInterview', 'Sunil Vaghela (imsunilvaghela)', 'article', 'https://github.com/imsunilvaghela/TheEmbeDEADInterview', 'Technical interview prep specifically geared toward Embedded Linux, Linux Kernel internals, Character/Platform Device Drivers, IPC (Inter-Process Communication), Toolchains, and Yocto Project.'),
    (gen_random_uuid(), target_user_id, curr_id, 'Embedded_SWE_Prep', 'srnvl', 'article', 'https://github.com/srnvl/Embedded_SWE_Prep', 'Embedded software coding problems, Grind 75 algorithmic patterns adapted for firmware, bit manipulation tricks, endianness detection, memory alignment, and struct padding.');

    -- 5. Insert 56 Topics
    -- Module 1 Topics
    INSERT INTO curriculum_topics (id, user_id, chapter_id, curriculum_id, title, description, estimated_hours, position, status, notes) VALUES
    (gen_random_uuid(), target_user_id, ch1_id, curr_id, 'Bitwise Operations: Master bit masking, setting, clearing, toggling, and reading bits', 'Master bit masking, setting, clearing, toggling, and reading specific bits using macro idioms', 1.5, 1, 'not_started', 'Macro idioms: SET_BIT, CLEAR_BIT, TOGGLE_BIT, READ_BIT. Source: srnvl/Embedded_SWE_Prep'),
    (gen_random_uuid(), target_user_id, ch1_id, curr_id, 'Bitwise Algorithms: Implement Brian Kernighan algorithm to count set bits in C', 'Implement Brian Kernighan''s algorithm to count set bits in C', 1.0, 2, 'not_started', 'Count set bits in O(k) time. Source: srnvl/Embedded_SWE_Prep'),
    (gen_random_uuid(), target_user_id, ch1_id, curr_id, 'Bitwise Algorithms: Find the only non-repeating number in an array using XOR logic', 'Find the only non-repeating number in an array using XOR logic', 1.0, 3, 'not_started', 'XOR logic cancellation properties. Source: srnvl/Embedded_SWE_Prep'),
    (gen_random_uuid(), target_user_id, ch1_id, curr_id, 'Bitwise Algorithms: Check power of 2 and reverse bits of 32-bit unsigned integer', 'Write functions to check power of 2 and reverse the bits of a 32-bit unsigned integer', 1.0, 4, 'not_started', 'Check power of 2 and bit reversal via shift operations. Source: srnvl/Embedded_SWE_Prep'),
    (gen_random_uuid(), target_user_id, ch1_id, curr_id, 'Keywords Deep Dive: Storage duration, scope, and linkage of static, extern, register', 'Analyze the storage duration, scope, and linkage of static, extern, and register', 1.5, 5, 'not_started', 'Internal vs external linkage, file scope vs block scope. Source: theEmbeddedGeorge'),
    (gen_random_uuid(), target_user_id, ch1_id, curr_id, 'Keywords Deep Dive: Master volatile in memory-mapped I/O, ISR variables, flags', 'Master volatile (when to use in memory-mapped I/O, ISR variables, and multithreading flags)', 1.5, 6, 'not_started', 'Compiler optimization suppression and memory barriers. Source: theEmbeddedGeorge'),
    (gen_random_uuid(), target_user_id, ch1_id, curr_id, 'Type Qualifiers: Master const pointer variants (const int*, int* const, const int* const)', 'Understand const pointer variants (const int *, int * const, and const int * const)', 1.0, 7, 'not_started', 'Pointer to constant data vs constant pointer to mutable data. Source: theEmbeddedGeorge'),
    (gen_random_uuid(), target_user_id, ch1_id, curr_id, 'Memory Layout: Draw and explain standard C memory layout (Text, Data, BSS, Heap, Stack)', 'Draw and explain the standard C memory layout (Text, Data, BSS, Heap, Stack)', 1.0, 8, 'not_started', 'Global initialized, zero-initialized BSS, runtime stack frames. Source: theEmbeddedGeorge'),
    (gen_random_uuid(), target_user_id, ch1_id, curr_id, 'Practical Drill: Complete Bit Manipulation problem set from srnvl/Embedded_SWE_Prep', 'Complete the Bit Manipulation problem set from srnvl/Embedded_SWE_Prep', 1.5, 9, 'not_started', 'Hands-on bit manipulation problem set. Source: srnvl/Embedded_SWE_Prep');

    -- Module 2 Topics
    INSERT INTO curriculum_topics (id, user_id, chapter_id, curriculum_id, title, description, estimated_hours, position, status, notes) VALUES
    (gen_random_uuid(), target_user_id, ch2_id, curr_id, 'Endianness Detection: Runtime Big Endian vs Little Endian detection via pointers and unions', 'Write a C program to detect Big Endian vs Little Endian at runtime using pointers and unions', 1.0, 10, 'not_started', 'Multi-byte union memory representation. Source: srnvl/Embedded_SWE_Prep'),
    (gen_random_uuid(), target_user_id, ch2_id, curr_id, 'Endianness Conversion: Fast byte-swap macro / function for 16-bit, 32-bit, 64-bit integers', 'Write a fast byte-swap macro / function for 16-bit, 32-bit, and 64-bit integers', 1.0, 11, 'not_started', 'Byte-level shifts and compiler builtins. Source: srnvl/Embedded_SWE_Prep'),
    (gen_random_uuid(), target_user_id, ch2_id, curr_id, 'Pointer Arithmetic: Master void pointers, function pointers, and function pointer arrays', 'Master void pointers, function pointers, and arrays of function pointers (jump tables)', 1.5, 12, 'not_started', 'Dynamic jump tables and state dispatch. Source: theEmbeddedGeorge'),
    (gen_random_uuid(), target_user_id, ch2_id, curr_id, 'Struct Alignment: Struct padding, alignment rules, and compiler pragma pack / attribute packed', 'Calculate struct sizes with memory padding, alignment rules, and compiler #pragma pack(1) / __attribute__((packed))', 1.5, 13, 'not_started', 'Word boundary alignment and unaligned access traps. Source: theEmbeddedGeorge'),
    (gen_random_uuid(), target_user_id, ch2_id, curr_id, 'Standard Library Clones: Implement custom memcpy, memmove (with overlap), and memset', 'Implement custom memcpy(), memmove() (handling overlapping memory), and memset()', 2.0, 14, 'not_started', 'Memory buffer copying with backward copy overlap protection. Source: srnvl/Embedded_SWE_Prep'),
    (gen_random_uuid(), target_user_id, ch2_id, curr_id, 'String Manipulation in C: Implement my_strstr, my_strcpy, and atoi without libc', 'Implement my_strstr(), my_strcpy(), and custom atoi without standard library dependencies', 1.5, 15, 'not_started', 'Safe zero-dependency string functions. Source: srnvl/Embedded_SWE_Prep'),
    (gen_random_uuid(), target_user_id, ch2_id, curr_id, 'Linked Lists for Embedded: In-place singly linked list reversal and circular linked list', 'Implement an in-place singly linked list reversal and circular linked list in pure C', 1.0, 16, 'not_started', 'In-place pointer reversal and circular lists. Source: srnvl/Embedded_SWE_Prep'),
    (gen_random_uuid(), target_user_id, ch2_id, curr_id, 'Practical Drill: Solve Flatten Multi-Level List and Detect Endianness from srnvl', 'Solve Flatten Multi-Level Linked List and Detect Endianness from srnvl/Embedded_SWE_Prep', 1.5, 17, 'not_started', 'Memory and pointer tracking drills. Source: srnvl/Embedded_SWE_Prep');

    -- Module 3 Topics
    INSERT INTO curriculum_topics (id, user_id, chapter_id, curriculum_id, title, description, estimated_hours, position, status, notes) VALUES
    (gen_random_uuid(), target_user_id, ch3_id, curr_id, 'Hardware Fundamentals: Open-drain vs push-pull GPIO, pull-up/down resistors, floating pins', 'Understand open-drain vs push-pull GPIO, pull-up/pull-down resistor calculations, and floating pins', 1.5, 18, 'not_started', 'Electrical characteristics and circuit topologies. Source: theEmbeddedGeorge'),
    (gen_random_uuid(), target_user_id, ch3_id, curr_id, 'Analog Interfacing: ADC resolution, sampling rates, sample-and-hold circuits, DAC basics', 'ADC resolution, sampling rates, sample-and-hold circuits, and DAC basics', 1.5, 19, 'not_started', 'Quantization error, ENOB, and Nyquist rate. Source: theEmbeddedGeorge'),
    (gen_random_uuid(), target_user_id, ch3_id, curr_id, 'Timers & PWM: Clock prescalers, auto-reload registers, capture/compare, PWM duty cycle', 'Clock prescalers, auto-reload registers, capture/compare channels, and PWM duty cycle control', 1.5, 20, 'not_started', 'Timer frequency and duty cycle math. Source: theEmbeddedGeorge'),
    (gen_random_uuid(), target_user_id, ch3_id, curr_id, 'Protocol Deep Dive - UART: Baud rate generation, framing errors, parity, flow control, ring buffers', 'Baud rate generation, framing errors, parity, flow control (RTS/CTS), and ring buffer integration', 1.5, 21, 'not_started', 'Asynchronous serial transmission and RTS/CTS flow control. Source: theEmbeddedGeorge'),
    (gen_random_uuid(), target_user_id, ch3_id, curr_id, 'Protocol Deep Dive - SPI: Master-Slave topology, CPOL/CPHA clock polarity modes, CS, DMA', 'Master-Slave topology, CPOL and CPHA clock polarity modes, Chip Select timings, and DMA transfers', 1.5, 22, 'not_started', 'SPI Modes 0-3 with timing diagrams and DMA transfers. Source: theEmbeddedGeorge'),
    (gen_random_uuid(), target_user_id, ch3_id, curr_id, 'Protocol Deep Dive - I2C: 7-bit/10-bit addressing, Start/Stop, ACK/NACK, clock stretching, arbitration', '7-bit vs 10-bit addressing, Start/Stop conditions, ACK/NACK, clock stretching, and multi-master arbitration', 1.5, 23, 'not_started', 'Wired-AND logic, bus capacitance, and pull-up sizing. Source: theEmbeddedGeorge'),
    (gen_random_uuid(), target_user_id, ch3_id, curr_id, 'Protocol Deep Dive - CAN Bus: Differential signaling, frame anatomy, bit stuffing, arbitration', 'Differential signaling, CAN frame anatomy, bit stuffing, identifier priority arbitration, and fault confinement', 2.0, 24, 'not_started', 'CAN_H/CAN_L dominant vs recessive, standard/extended frames. Source: theEmbeddedGeorge'),
    (gen_random_uuid(), target_user_id, ch3_id, curr_id, 'Interrupt Architecture: ARM Cortex-M NVIC, vector tables, priorities, latency, re-entrant ISRs', 'ARM Cortex-M NVIC, interrupt vector tables, interrupt priorities, latency, and writing re-entrant ISRs', 1.5, 25, 'not_started', 'Preemption priority, sub-priority, and tail-chaining. Source: theEmbeddedGeorge'),
    (gen_random_uuid(), target_user_id, ch3_id, curr_id, 'Practical Drill: Review George Li Communication Protocols interview summary sheets', 'Review George Li''s Communication Protocols interview summary sheets and notes', 1.5, 26, 'not_started', 'Protocol comparison and defense notes. Source: theEmbeddedGeorge');

    -- Module 4 Topics
    INSERT INTO curriculum_topics (id, user_id, chapter_id, curriculum_id, title, description, estimated_hours, position, status, notes) VALUES
    (gen_random_uuid(), target_user_id, ch4_id, curr_id, 'Build a Custom Shell: UNIX shell in C with command parsing, fork, execvp, jobs, piping', 'Create a UNIX shell in C with command parsing, fork(), execvp(), background jobs (&), and piping (|)', 4.0, 27, 'not_started', 'Process lifecycle, waitpid, dup2 redirection, and signal handling. Source: nCally/Project-Based-Tutorials-in-C'),
    (gen_random_uuid(), target_user_id, ch4_id, curr_id, 'Build a Memory Allocator: Bare-bones malloc, calloc, and free using sbrk and linked blocks', 'Implement a bare-bones malloc(), calloc(), and free() using sbrk() or memory blocks with linked-list chunk tracking', 3.5, 28, 'not_started', 'Chunk tracking, first-fit allocation, and block coalescing. Source: nCally/Project-Based-Tutorials-in-C'),
    (gen_random_uuid(), target_user_id, ch4_id, curr_id, 'Build a Circular Buffer (Ring Buffer): Lock-free SPSC circular buffer for UART data streaming', 'Write a lock-free single-producer single-consumer circular buffer for UART data streaming', 2.5, 29, 'not_started', 'Atomic memory barriers and head/tail index masks. Source: nCally/Project-Based-Tutorials-in-C'),
    (gen_random_uuid(), target_user_id, ch4_id, curr_id, 'Build a Finite State Machine (FSM): Table-driven state machine in C using function pointers', 'Implement a table-driven state machine in C using function pointers for embedded device control', 2.0, 30, 'not_started', 'Transition matrix and state action handlers. Source: nCally/Project-Based-Tutorials-in-C'),
    (gen_random_uuid(), target_user_id, ch4_id, curr_id, 'Code Quality: Run GCC with -Wall -Wextra -Werror -pedantic and verify clean memory with Valgrind', 'Run GCC with -Wall -Wextra -Werror -pedantic and verify clean memory with Valgrind / AddressSanitizer', 2.0, 31, 'not_started', 'Zero memory leaks and undefined behavior verification. Source: nCally/Project-Based-Tutorials-in-C');

    -- Module 5 Topics
    INSERT INTO curriculum_topics (id, user_id, chapter_id, curriculum_id, title, description, estimated_hours, position, status, notes) VALUES
    (gen_random_uuid(), target_user_id, ch5_id, curr_id, 'RTOS vs Bare-Metal: Superloop architecture vs preemptive scheduling trade-offs', 'Superloop architecture vs preemptive scheduling trade-offs', 1.5, 32, 'not_started', 'Deterministic latency vs memory footprint. Source: TheEmbeDEADInterview'),
    (gen_random_uuid(), target_user_id, ch5_id, curr_id, 'Scheduling Algorithms: Rate Monotonic Scheduling (RMS), EDF, and Round Robin', 'Rate Monotonic Scheduling (RMS), Earliest Deadline First (EDF), and Round Robin', 1.5, 33, 'not_started', 'Static RMS utilization bound vs dynamic EDF. Source: theEmbeddedGeorge'),
    (gen_random_uuid(), target_user_id, ch5_id, curr_id, 'Synchronization Primitives: Mutex vs Counting Semaphore vs Binary Semaphore', 'Mutex vs Counting Semaphore vs Binary Semaphore', 1.5, 34, 'not_started', 'Lock ownership semantics and ISR signaling. Source: theEmbeddedGeorge'),
    (gen_random_uuid(), target_user_id, ch5_id, curr_id, 'Real-Time Hazards: Priority Inversion, Priority Inheritance, and Deadlock detection', 'Priority Inversion, Priority Inheritance, and Deadlock detection (Coffman conditions)', 1.5, 35, 'not_started', 'Mars Pathfinder case study and Coffman conditions. Source: TheEmbeDEADInterview'),
    (gen_random_uuid(), target_user_id, ch5_id, curr_id, 'Inter-Task Communication: Message queues, event flags, task notifications, shared memory', 'Message queues, event flags, task notifications, and shared memory', 1.5, 36, 'not_started', 'Pass-by-value queue vs direct-to-task notifications. Source: theEmbeddedGeorge'),
    (gen_random_uuid(), target_user_id, ch5_id, curr_id, 'Critical Sections: Disabling interrupts vs task locking vs spinlocks', 'Disabling interrupts vs task locking vs spinlocks', 1.5, 37, 'not_started', 'taskENTER_CRITICAL and Cortex-M basepri masking. Source: TheEmbeDEADInterview'),
    (gen_random_uuid(), target_user_id, ch5_id, curr_id, 'FreeRTOS Practice: Create 2-task FreeRTOS project simulating sensor reader and alert task', 'Create a 2-task FreeRTOS project simulating a sensor reading task and an alert output task', 2.0, 38, 'not_started', 'Queue passing and task priorities in FreeRTOS. Source: TheEmbeDEADInterview');

    -- Module 6 Topics
    INSERT INTO curriculum_topics (id, user_id, chapter_id, curriculum_id, title, description, estimated_hours, position, status, notes) VALUES
    (gen_random_uuid(), target_user_id, ch6_id, curr_id, 'Embedded Linux Architecture: Bootloader (U-Boot), Linux Kernel, RootFS, and Device Tree', 'Bootloader (U-Boot), Linux Kernel, Root Filesystem, and Device Tree (.dts/.dtsi)', 2.0, 39, 'not_started', 'ROM -> SPL -> U-Boot -> Kernel -> init process. Source: TheEmbeDEADInterview'),
    (gen_random_uuid(), target_user_id, ch6_id, curr_id, 'Kernel Space vs User Space: Syscalls, virtual memory, page tables, context switch overhead', 'Syscalls, virtual memory management, page tables, and context switching overhead', 2.0, 40, 'not_started', 'MMU page translation, TLB flushes, copy_to_user. Source: TheEmbeDEADInterview'),
    (gen_random_uuid(), target_user_id, ch6_id, curr_id, 'Inter-Process Communication: Pipes, Named FIFOs, POSIX Shared Memory, Message Queues, Sockets', 'Pipes, Named FIFOs, POSIX Shared Memory, Message Queues, and UNIX Domain Sockets', 2.0, 41, 'not_started', 'IPC mechanism comparison and synchronization. Source: TheEmbeDEADInterview'),
    (gen_random_uuid(), target_user_id, ch6_id, curr_id, 'Linux Kernel Module (LKM): Write, compile, and insert Hello World module (insmod/rmmod/dmesg)', 'Write, compile, and insert a "Hello World" kernel module using insmod, rmmod, and dmesg', 2.0, 42, 'not_started', 'Kernel build system, module_init, and printk levels. Source: TheEmbeDEADInterview'),
    (gen_random_uuid(), target_user_id, ch6_id, curr_id, 'Character Device Driver: Build character driver with open, release, read, write, ioctl', 'Build a character driver implementing open(), release(), read(), write(), and ioctl()', 2.5, 43, 'not_started', 'file_operations struct and cdev device nodes. Source: TheEmbeDEADInterview'),
    (gen_random_uuid(), target_user_id, ch6_id, curr_id, 'Interrupt Handling in Linux: Top half (hard ISR) vs Bottom half (Tasklets, Workqueues, IRQs)', 'Top half (hard ISR) vs Bottom half (Tasklets, Workqueues, Threaded IRQs)', 1.5, 44, 'not_started', 'Atomic ISR vs deferred workqueue thread context. Source: TheEmbeDEADInterview'),
    (gen_random_uuid(), target_user_id, ch6_id, curr_id, 'Build Systems & Cross-Compilation: Configure cross-compile toolchain (arm-none-eabi/linux-gnueabi)', 'Configure a cross-compile toolchain (arm-none-eabi-gcc or arm-linux-gnueabihf-gcc)', 1.5, 45, 'not_started', 'Sysroot setup and target architecture flags. Source: TheEmbeDEADInterview'),
    (gen_random_uuid(), target_user_id, ch6_id, curr_id, 'Yocto / Buildroot Overview: Recipes, layers, bitbake targets, and minimal Linux images', 'Understand recipes, layers, bitbake targets, and generating custom minimal Linux images', 1.5, 46, 'not_started', 'BitBake recipes, layers, and minimal rootfs images. Source: TheEmbeDEADInterview');

    -- Module 7 Topics
    INSERT INTO curriculum_topics (id, user_id, chapter_id, curriculum_id, title, description, estimated_hours, position, status, notes) VALUES
    (gen_random_uuid(), target_user_id, ch7_id, curr_id, 'Project Option A (Network Stack): Lightweight HTTP/TCP web server in C with non-blocking epoll', 'Build a lightweight HTTP/TCP web server in C utilizing socket programming, non-blocking I/O, and epoll()', 4.0, 47, 'not_started', 'Socket programming, non-blocking I/O, epoll event loops. Source: nCally/Project-Based-Tutorials-in-C'),
    (gen_random_uuid(), target_user_id, ch7_id, curr_id, 'Project Option B (Virtual Machine / Architecture): CHIP-8 or LC-3 computer emulator in C', 'Build a CHIP-8 or LC-3 virtual computer emulator in C with CPU instruction cycle decoding', 4.0, 48, 'not_started', 'CPU opcode decoding, virtual registers, instruction cycles. Source: nCally/Project-Based-Tutorials-in-C'),
    (gen_random_uuid(), target_user_id, ch7_id, curr_id, 'Project Option C (Key-Value Database): Persistent B-tree or append-only key-value store in pure C', 'Build a simple persistent B-tree or append-only key-value store in pure C', 3.0, 49, 'not_started', 'Disk serialization, file indexing, and data persistence. Source: nCally/Project-Based-Tutorials-in-C'),
    (gen_random_uuid(), target_user_id, ch7_id, curr_id, 'Testing & Verification: Write unit tests in C (Unity or CMocka) validating memory bounds', 'Write unit tests in C (using Unity or CMocka) validating edge cases and memory bounds', 1.0, 50, 'not_started', 'Automated test suites and boundary conditions. Source: nCally/Project-Based-Tutorials-in-C'),
    (gen_random_uuid(), target_user_id, ch7_id, curr_id, 'Documentation: Document architecture, memory footprint, and benchmarks in GitHub README', 'Document the architecture, memory footprint, and benchmarks in a GitHub README', 1.0, 51, 'not_started', 'Benchmarking and memory footprint profiling. Source: nCally/Project-Based-Tutorials-in-C');

    -- Module 8 Topics
    INSERT INTO curriculum_topics (id, user_id, chapter_id, curriculum_id, title, description, estimated_hours, position, status, notes) VALUES
    (gen_random_uuid(), target_user_id, ch8_id, curr_id, 'Rapid-Fire Drill: Answer 50 standard embedded interview questions from TheEmbeDEADInterview', 'Answer 50 standard embedded interview questions from imsunilvaghela/TheEmbeDEADInterview', 2.0, 52, 'not_started', 'Core conceptual interview review questions. Source: TheEmbeDEADInterview'),
    (gen_random_uuid(), target_user_id, ch8_id, curr_id, 'Circuit & Bus Protocol Defense: Explain SPI vs I2C vs CAN electrical characteristics', 'Explain SPI vs I2C vs CAN electrical characteristics and troubleshooting steps', 2.0, 53, 'not_started', 'Signal analysis, termination resistors, and troubleshooting. Source: theEmbeddedGeorge'),
    (gen_random_uuid(), target_user_id, ch8_id, curr_id, 'Live Coding Drill: Write custom byte-level packet parser in C with CRC verification (< 30 min)', 'Write a custom byte-level packet parser in C with CRC verification in under 30 minutes', 1.5, 54, 'not_started', 'Fast timed packet framing and CRC verification. Source: srnvl/Embedded_SWE_Prep'),
    (gen_random_uuid(), target_user_id, ch8_id, curr_id, 'Debugging Scenario Defense: Walk through resolving Hard Fault exception (CFSR, MMFAR, BFAR)', 'Walk through resolving a hard fault exception (Bus Fault, Memory Management Fault, Usage Fault)', 1.5, 55, 'not_started', 'Cortex-M fault registers and stack unwinding. Source: theEmbeddedGeorge'),
    (gen_random_uuid(), target_user_id, ch8_id, curr_id, 'Tooling Fluency: Configure GDB breakpoints, watchpoints, inspect registers, examine core dumps', 'Explain how to configure GDB breakpoints, watchpoints, examine registers, and inspect core dumps', 2.0, 56, 'not_started', 'GDB debugging commands, watchpoints, and core analysis. Source: All 4 Sources');

    -- 6. Insert Tasks honoring Matrix Protection (All in Inbox, Quadrant Null, Deadline Null)
    -- Master Container Task
    INSERT INTO tasks (id, user_id, title, notes, status, quadrant, deadline, estimated_minutes, estimate_source)
    VALUES (
        parent_task_id,
        target_user_id,
        'Embedded Systems & C Firmware Mastery Curriculum (98h)',
        'Master container tracking the 8-module Embedded Systems learning path across 4 competency pillars (Embedded C, Bare-Metal Protocols, Systems Projects, and Embedded Linux). Synthesis of nCally, theEmbeddedGeorge, imsunilvaghela, and srnvl repositories.',
        'inbox',
        NULL,
        NULL,
        5880,
        'user'
    );

    -- 8 Child Module Container Tasks
    INSERT INTO tasks (id, user_id, title, notes, status, quadrant, deadline, estimated_minutes, estimate_source) VALUES
    (gen_random_uuid(), target_user_id, 'Embedded Curriculum: Module 1 - Embedded C Mastery & Bit Manipulation (11h)', 'Pillar 1: Embedded C & Memory Architecture. Bit masking, Kernighan algorithm, storage classes, volatile, const pointers, memory layout.', 'inbox', NULL, NULL, 660, 'user'),
    (gen_random_uuid(), target_user_id, 'Embedded Curriculum: Module 2 - Low-Level Memory, Endianness & Structs (11h)', 'Pillar 1: Embedded C & Memory Architecture. Endianness detection/conversion, pointer arithmetic, struct padding/alignment, custom libc functions.', 'inbox', NULL, NULL, 660, 'user'),
    (gen_random_uuid(), target_user_id, 'Embedded Curriculum: Module 3 - Hardware Peripherals & Bus Protocols (14h)', 'Pillar 2: Bare-Metal Microcontroller Architecture & Protocols. GPIO, Timers, ADC/DAC, UART, SPI, I2C, CAN Bus, Cortex-M NVIC.', 'inbox', NULL, NULL, 840, 'user'),
    (gen_random_uuid(), target_user_id, 'Embedded Curriculum: Module 4 - Systems Project Track 1: Core Systems in C (14h)', 'Pillar 3: Project-Driven Systems Programming in C. UNIX shell with pipes, heap memory allocator, lock-free ring buffer, table-driven FSM.', 'inbox', NULL, NULL, 840, 'user'),
    (gen_random_uuid(), target_user_id, 'Embedded Curriculum: Module 5 - RTOS Fundamentals & Concurrency (11h)', 'Pillar 2: Bare-Metal Microcontroller Architecture & Protocols. Superloop vs preemptive kernels, RMS/EDF, semaphores, mutexes, priority inversion, FreeRTOS.', 'inbox', NULL, NULL, 660, 'user'),
    (gen_random_uuid(), target_user_id, 'Embedded Curriculum: Module 6 - Embedded Linux & Character Drivers (15h)', 'Pillar 4: Embedded Linux & Device Drivers. U-Boot/Kernel/RootFS/DTS, Syscalls, IPC, LKMs, Character Device Drivers, Top/Bottom half IRQs, Yocto.', 'inbox', NULL, NULL, 900, 'user'),
    (gen_random_uuid(), target_user_id, 'Embedded Curriculum: Module 7 - Systems Project Track 2: Systems Capstone (13h)', 'Pillar 3: Project-Driven Systems Programming in C. Non-blocking HTTP/TCP server, CHIP-8 / LC-3 emulator, or key-value store in C.', 'inbox', NULL, NULL, 780, 'user'),
    (gen_random_uuid(), target_user_id, 'Embedded Curriculum: Module 8 - Embedded Technical Interview Gauntlet (9h)', 'All Pillars: Holistic Review. 50 embedded interview questions, bus electrical defenses, timed packet parser with CRC, Hard Fault resolution, GDB.', 'inbox', NULL, NULL, 540, 'user');

END $$;
```

---

## 8. Verification & Quality Gates

Before declaring completion of ingestion or deployment:
1. **No Em or En Dashes Gate:**
   Execute a text scan across all modified files (`src/data/curriculumDefaults.js`, `src/components/curriculum/CurriculumView.jsx`, `docs/EMBEDDED_CURRICULUM_INGESTION_PLAN.md`) to verify zero occurrences of unicode `\u2014` and `\u2013`.
2. **Solid Color & Zero Gradients Gate:**
   Confirm all new UI elements adhere to the dark void theme with amber accents (`#f59e0b` or `text-amber-400`), using solid border colors and semi-transparent void backgrounds (`bg-void/60`, `border-pulsar/30`, `border-amber-500/30`). No CSS gradient utilities (`from-...`, `to-...`, `via-...`) are permitted.
3. **Workspace Boundary Gate:**
   Verify that all files are created or modified strictly within `e:\Academic files\Competiton and Project files\Polaris\asa.polaris`.
4. **Build Gate:**
   Run `npm run build` in PowerShell to ensure the Vite production bundle compiles cleanly with 0 errors and all service worker assets are intact.
