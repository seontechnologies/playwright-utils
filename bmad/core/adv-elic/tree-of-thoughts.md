# Tree of Thoughts Deep Dive

```xml
<elicitation id="bmad/core/adv-elic/tree-of-thoughts.md" name="Tree of Thoughts Deep Dive">
  <description>Advanced elicitation technique for tree of thoughts deep dive</description>

  <core-method>
    Break problem into discrete "thoughts" or intermediate steps. Explore multiple reasoning paths simultaneously. Use self-evaluation to classify each path as "sure", "likely", or "impossible". Apply search algorithms (BFS/DFS) to find optimal solution paths.
  </core-method>

  <llm>
    <action>Break the problem into discrete thought units or intermediate reasoning steps</action>
    <action>Generate multiple reasoning paths simultaneously for each thought</action>
    <action>Self-evaluate each path as "sure", "likely", or "impossible"</action>
    <action>Apply breadth-first or depth-first search to explore the thought tree</action>
    <action>Prune impossible paths and focus resources on promising branches</action>
  </llm>

  <final-report title="Tree of Thoughts Analysis">
    <value>Problem Breakdown: [Discrete thought units identified]</value>
    <value>Reasoning Paths: [Multiple approaches explored with evaluations]</value>
    <value>Path Evaluation: [Sure/likely/impossible classifications]</value>
    <value>Search Strategy: [BFS/DFS approach used]</value>
    <value>Optimal Solution: [Best path identified through tree traversal]</value>
  </final-report>
</elicitation>
```
