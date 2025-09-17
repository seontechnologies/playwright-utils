# Red Team vs Blue Team

```xml
<elicitation id="bmad/core/adv-elic/red-blue-team.md" name="Red Team vs Blue Team">
  <description>Advanced elicitation technique for red team vs blue team</description>

  <core-method>Use adversarial Red Team (attack/find vulnerabilities) vs Blue Team (defend/strengthen) analysis to reveal blind spots and create more robust solutions.</core-method>

  <llm>
    <action>Red Team aggressively attacks the proposal to find vulnerabilities</action>
    <action>Blue Team defends and strengthens the approach against attacks</action>
    <action>Document all discovered weaknesses and defensive improvements</action>
  </llm>

  <final-report title="Red vs Blue Team Analysis">
    <value>PROPOSAL: [Solution being tested]</value>
    <value>RED TEAM ATTACKS: [Vulnerabilities found]</value>
    <value>BLUE TEAM DEFENSES: [Counter-measures and strengthening]</value>
    <value>BATTLE RESULTS: [Key weaknesses exposed]</value>
    <value>HARDENED SOLUTION: [Improved robust approach]</value>
  </final-report>
</elicitation>
```
