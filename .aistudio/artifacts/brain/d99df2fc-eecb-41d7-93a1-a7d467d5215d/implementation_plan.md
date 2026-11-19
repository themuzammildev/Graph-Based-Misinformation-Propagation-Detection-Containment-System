# Implementation Plan: Prune Non-PS Features & Consolidate to M2, M3, M4

## Goal
Prune all features not explicitly mentioned in the assignment Problem Statement (PS) and consolidate the application into a clean, minimal, 4-section architecture directly corresponding to **Module 2 (Mathematical Logic)**, **Module 3 (Recurrence Relations)**, and **Module 4 (Graph Theory & Trees)**.

---

## 1. Problem Statement Alignment Matrix

| PS Component | Discrete Math Module | PS Requirements | Proposed Consolidation |
| :--- | :--- | :--- | :--- |
| **Inputs** | Graph ($V, E$) + Logic Attributes | User network, Sharing relationships, Message source, Number of shares, Verification status | **Section 1: Network & Inputs** |
| **Logic Rules** | **Module 2 (M2)** | Logic $\rightarrow$ Credibility rules, determine high-risk nodes ($U \land S$) | **Section 2: Logic & Credibility Rules** |
| **Spread & Tree** | **Module 3 (M3) + Module 4 (M4)** | Propagation tree (BFS), Predicted spread (Recurrence relation $S(n)$) | **Section 3: Propagation Tree & Spread Prediction** |
| **Analysis** | **Module 4 (M4)** | Most influential nodes (Degree Centrality), Containment candidates (Vertex Cut) | **Section 4: Influence & Containment** |

---

## 2. Features to Remove (Not in Problem Statement)

1. **Remove Standalone "About Project" Tab**:
   - The PS requires an application to be submitted to ACM SRC, not an internal guide tab. Academic credits will remain cleanly integrated into the sidebar footer.
2. **Remove Standalone "Results & Report" Tab**:
   - The PS requests direct visual display of outputs (Propagation tree, Influential nodes, Predicted spread, Containment candidates), not a markdown text exporter.
3. **Remove Standalone "Mathematical Model" Tab**:
   - Instead of a disconnected theoretical textbook tab, mathematical formulas ($G=(V,E)$, $U \land S$, $S(n+1)$, $C_D(v)$, $\Delta R$) will be displayed concisely directly on the screens where they are computed.
4. **Remove Extraneous UI Clutter & Redundant Controls**:
   - Remove decorative badges and redundant secondary views.
   - Clean up top header to focus strictly on simulation status and message attributes.

---

## 3. The 4 Consolidated Core Sections

### Section 1: Dashboard & Network Inputs
- **Interactive Graph Canvas**: Displays users (vertices $V$) and sharing channels (directed edges $E$).
- **Direct PS Inputs**:
  - Message source ($v_0$)
  - Number of shares ($S$)
  - Verification status ($V$ vs. $U = \neg V$)
  - Simple user/connection controls.
- **Visual Display**: Clear mapping of Source $\rightarrow$ Spread $\rightarrow$ High-Risk nodes.

### Section 2: Logic & Credibility Rules (Module 2)
- **Propositional Logic Engine**:
  - Atomic propositions: $V$ (Verified), $U = \neg V$ (Unverified), $S$ (Shares $\ge 50$), $I$ (Independent Sources $\ge 2$).
  - Compound rule evaluation: $\text{HighRisk} = U \land S$.
  - Evaluation breakdown mapping credibility score and risk categorization.

### Section 3: Propagation Tree & Spread Prediction (Modules 3 & 4)
- **Propagation Tree (M4)**: Step-by-step BFS traversal wavefronts ($L_0, L_1, L_2\dots$) showing the exact directed dissemination tree.
- **Recurrence Spread Prediction (M3)**: Direct side-by-side comparison between:
  - Theoretical prediction: $S(n+1) = \min(N, \lfloor r \cdot S(n) \rfloor)$
  - Empirical actual spread from BFS simulation.

### Section 4: Influence & Containment Analysis (Module 4)
- **Most Influential Nodes**: Clean ranked data table showing Out-Degree and Normalized Degree Centrality $C_D(v) = \frac{\text{deg}^+(v)}{N-1}$.
- **Containment Candidates**: Cut-vertex identification showing prevented reach $\Delta R(c) = R(v_0 \mid G) - R(v_0 \mid G \setminus \{c\})$, with one-click containment simulation.

---

## 4. Implementation Steps

1. **Update `Sidebar.tsx`**:
   - Reduce navigation tabs from 10 to the 4 core sections:
     - `dashboard`: Overview & Network
     - `logic`: Logic & Credibility (M2)
     - `propagation`: Propagation & Prediction (M3 & M4)
     - `containment`: Influence & Containment (M4)
   - Keep clean, minimal styling with minimal badges.
2. **Consolidate Views in `App.tsx`**:
   - Map active tabs to the 4 streamlined views.
   - Embed relevant inputs directly into the views so students can demonstrate inputs and outputs without jumping across 10 pages.
3. **Verify Build & Run Lint**:
   - Run `compile_applet` and `lint_applet` to confirm clean compilation and smooth dev server execution.
