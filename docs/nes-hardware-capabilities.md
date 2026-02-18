# NES Hardware Capabilities

## Hardware overview

Being an 8-bit system from the 80s, the NES has a hilariously limited spec compared to today’s standards:

- 8-bit 6502 CPU running at 1.79 MHz. It has 3 general-purpose registers A/X/Y, and 3 special registers P (status), SP (stack pointer), and PC (program counter), all of them being 8-bit except PC which is 16-bit.
- 16-bit addressable memory space. In theory it can address 64K memory, however it only has 2KB onboard RAM. The rest is either not wired up (and are mirrors of those 2KB), or mapped to special I/O registers, or cartridge ROM/RAM space.
- PPU (Picture Processing Unit) supporting rendering 256x240 screen composed of 8x8 tiles for background, up to 64 8x8 or 8x16 sprites for moving objects. It supports pixel-level scrolling (which is a big deal back in that day).
- APU (Audio Processing Unit) supporting 2 pulse channels, 1 triangle channel, 1 noise channel, and 1 DMC (delta modulation) channel. One can still make good music with these, just not great sound effects.
- Controllers: from classic NES controller to NES mouse.
- Cartridge boards (and mappers): there are many different kinds of game cartridge boards. They come with game data as ROMs, sometimes their own battery-backed RAM, or in some cases, their own audio processing unit. Most importantly, they also come with special hardware, referred to as mappers, that dynamically maps ROM/RAM into CPU and PPU memory space, bypassing the limitation of 16-bit address space. Some game cartridges come with more than 256KB of CHR ROM and swap/map portions of it on demand.

## Before you start

Assuming you haven’t done NES programming on real NES hardware before, there are plenty of materials that cover NES hardware behavior.

You need to have a good understanding of the following topics:

- CPU: instructions, addressing modes, registers and status flags, interrupts.
- PPU: PPU registers, pattern table, name table, sprites, rendering pipeline, and scrolling.
- APU: APU registers, and how to generate square/triangle waves.
- iNES format: most games are in this format.
- Controller: controller register.
- Mappers: how mappers control memory mapping. Different mappers have different capabilities.

It took about a week and half to add CPU, PPU, and a few mappers in order to get some of the major commercial games to work perfectly (Super Contra, Super Mario Bros, Shadow of the Ninja, etc). If you want to support most of the games out there, prepare for a lot of work (implementing mappers and debugging). But most of that work is incremental and you can decide to stop at any time.

## Which language/framework to pick

Language choice probably doesn’t matter that much. People have written NES emulators using all kinds of languages (C/C++, JavaScript, Go, C#, etc). Just pick your favorite language and go. It’s an 8-bit processor, so emulation performance on today’s powerful machines is usually not an issue. Just don’t go crazy creating new objects and trigger GC, if you are using a language that has one.

Find a good library for your language that supports rendering 2D graphics, controllers, and audio. You can choose a cross-platform one, or work with OS-specific libraries.

For example, you can use C++ and SDL for rendering/input/audio. This has the benefit that everything is cross-platform by default.

The core game engine can be its own library and be agnostic about which framework you choose, and the main app can use SDL to provide the rendering/input/audio capabilities and can be swapped to use whatever technology/framework is appropriate for the platform. For example, you can use a JavaScript framework in the browser to interact with the C++ game engine, and do the rendering/input entirely in the browser.

## Have a plan

Before you actually go write the emulator, it’ll be good to have a plan of attack: which component to emulate first and what to test, etc. It’s definitely not a good idea to run Super Mario Bros as your first test.
