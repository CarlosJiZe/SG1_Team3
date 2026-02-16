# Personal Reflection: GreenGrid Simulation Project
**Student:** Andrés González Gómez
**Team:** Team 3
**Date:** 16/02/2026

---

## Executive Summary

My contribution to the GreenGrid Simulation Project focused primarily on the initial system design, establishing the architecture that all components rely on. Additionally, I participated in verification, reviewed key modules, and ensured consistency across the simulation workflow. This process strengthened my understanding of large-scale system organization, modularity, and the importance of designing with future testing and debugging in mind.

---

## Team Collaboration and My Role

### Initial Design 

I was responsible for building the core architecture of the simulation. This included defining:

The file structure

How solar, battery, inverter, and logger components would interact

The timestep logic and daily update cycle

How the configuration parameters would drive the entire system

This initial framework allowed the rest of the team to work with a clear, stable base.

### My Role

After building the architecture, my focus shifted to:
- Reviewing code to ensure it followed the original design
- Verifying that energy flows matched the intended logic
- Running test simulations to check consistency
- Detecting potential bottlenecks or redundant computations
- Exploring small-scale optimizations like early-exit logic (even if not ultimately applied)

Much of my work involved ensuring the system stayed aligned with the intended model and behaved predictably under different configurations.

### Team Contributions

While I focused on architecture, Carlos handled deep debugging and validation, and Martin contributed stress testing and documentation. The combination of these roles allowed the system to improve rapidly and remain stable.

---

## Implementation Journey

### Designing the Architecture

Starting with a blank structure, I mapped how each subsystem would interact. The goal was to keep components independent but coordinated. This meant:
- The simulation controlled time
- Each component handled its own internal logic
- DataLogger stored all outputs cleanly
- Config values dictated behavior through dependency injection
This structure made debugging and testing much easier later.

### Supporting Debugging and Verification

As the team identified bugs, my effort shifted to checking whether recent fixes conflicted with the intended structure. I also reviewed flows such as:
- Battery charge/discharge order
- Inverter handling
- Daily cycle transitions
- Data logging vs. real state
These reviews helped ensure that new corrections didn’t introduce architectural inconsistencies.

---

## Key Lessons Learned

**Good architecture prevents many bugs** — A clear design makes later development smoother and debugging much easier.

**Coordination matters** — Seeing how each subsystem affects the others taught me the importance of predictable interfaces.

**Validation is ongoing** — Even after designing the system, I needed to review how implementation choices impacted the model.

**Small optimizations can be meaningful** — Even if we didn’t apply early-exit logic, evaluating improvements improves understanding.

---

## Design Decisions for Future Integration

With the architectural experience from this phase, I would recommend:
- Expanding modularity to support new components
- Creating formal diagrams for future contributors
- Adding automated validation to detect architecture-breaking changes
- Defining stricter data-flow contracts between modules
These steps would protect the design as the simulation grows.

---

## Technical Skills Developed

- High-level system design
- Cross-module consistency checking
- Simulation flow planning
- Understanding battery/inverter modeling structures
- Collaborative review and iterative refinement

---

## Personal Growth

Designing the system gave me a deeper appreciation for how complex interactions behave over long simulations. I learned to anticipate problems early, structure code to reduce ambiguity, and communicate design intentions clearly to my team. The project reinforced the value of thinking ahead, reviewing assumptions, and balancing clarity with flexibility.

---

## Conclusion

My role in establishing the initial system structure and later validating its integrity was essential to the project’s stability. Through this experience, I strengthened my skills in architecture, collaboration, and high-level problem-solving. I leave the project with a clearer understanding of how good design supports every phase of development—from implementation to debugging to documentation.