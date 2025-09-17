<!-- Powered by BMAD-CORE™ -->

# competitor

```xml
<template id="bmad/bmm/templates/competitor.md" name="Competitive Analysis Report" filename="{project-root}{output-directory}/competitor-analysis.md">

  <title>Competitive Analysis Report: {{project_product_name}}</title>

  <!-- IDE-INJECT-POINT: competitor-subagent-instructions -->

  <sections>

    <section id="executive-summary" title="Executive Summary" status="required">
      <instruction>
        Provide high-level competitive insights, main threats and opportunities, and recommended strategic actions. Write this section LAST after completing all analysis.

        <llm><i>Synthesize all competitive findings into actionable executive summary</i></llm>

<llm critical="true">
  <i>MANDATORY: Before finalizing, use the 'bmm-document-reviewer' subagent to validate competitive analysis completeness and strategic recommendations.</i>
</llm>

      </instruction>
    </section>

    <section id="analysis-scope" title="Analysis Scope &amp; Methodology" status="required">
      <instruction>
        This template guides comprehensive competitor analysis. Start by understanding the user's competitive intelligence needs and strategic objectives. Help them identify and prioritize competitors before diving into detailed analysis.
      </instruction>

      <sections>
        <section id="analysis-purpose" title="Analysis Purpose" status="required">
          <instruction>
            Define the primary purpose:
            - New market entry assessment
            - Product positioning strategy
            - Feature gap analysis
            - Pricing strategy development
            - Partnership/acquisition targets
            - Competitive threat assessment
          </instruction>
        </section>

        <section id="competitor-categories" title="Competitor Categories Analyzed" status="required">
          <instruction>
            List categories included:
            - Direct Competitors: Same product/service, same target market
            - Indirect Competitors: Different product, same need/problem
            - Potential Competitors: Could enter market easily
            - Substitute Products: Alternative solutions
            - Aspirational Competitors: Best-in-class examples
          </instruction>
        </section>

        <section id="research-methodology" title="Research Methodology" status="required">
          <instruction>
            Describe approach:
            - Information sources used
            - Analysis timeframe
            - Confidence levels
            - Limitations
          </instruction>
        </section>
      </sections>
    </section>

    <section id="competitive-landscape" title="Competitive Landscape Overview" status="required">
      <instruction>
        Provide overview of the competitive environment.
      </instruction>

      <sections>
        <section id="market-structure" title="Market Structure" status="required">
          <instruction>
            Describe the competitive environment:
            - Number of active competitors
            - Market concentration (fragmented/consolidated)
            - Competitive dynamics
            - Recent market entries/exits
          </instruction>
        </section>

        <section id="prioritization-matrix" title="Competitor Prioritization Matrix" status="required">
          <instruction>
            Help categorize competitors by market share and strategic threat level

            Create a 2x2 matrix:
            - Priority 1 (Core Competitors): High Market Share + High Threat
            - Priority 2 (Emerging Threats): Low Market Share + High Threat
            - Priority 3 (Established Players): High Market Share + Low Threat
            - Priority 4 (Monitor Only): Low Market Share + Low Threat
          </instruction>
        </section>
      </sections>
    </section>

    <section id="competitor-profiles" title="Individual Competitor Profiles" status="required" repeatable="true">
      <instruction>
        Create detailed profiles for each Priority 1 and Priority 2 competitor. For Priority 3 and 4, create condensed profiles.

        <llm><i>Gather comprehensive information about each key competitor</i></llm>

<llm critical="true">
  <i>MANDATORY: Use the 'bmm-market-researcher' subagent to gather comprehensive competitive intelligence for each competitor profile.</i>
  <i>The subagent will analyze positioning, strategy, and market dynamics.</i>
</llm>

      </instruction>

      <sections>
        <section id="competitor" title="[Competitor Name] - Priority [Level]" status="required">
          <instruction>
            Profile for individual competitor.
          </instruction>

          <sections>
            <section id="company-overview" title="Company Overview" status="required">
              <instruction>
                - **Founded:** [Year and founders]
                - **Headquarters:** [Location]
                - **Company Size:** [Employees/revenue]
                - **Funding:** [Total raised/investors]
                - **Leadership:** [Key executives]
              </instruction>
            </section>

            <section id="business-model" title="Business Model &amp; Strategy" status="required">
              <instruction>
                - **Revenue Model:** [How they make money]
                - **Target Market:** [Customer segments]
                - **Value Proposition:** [Core value promise]
                - **Go-to-Market Strategy:** [GTM approach]
                - **Strategic Focus:** [Current priorities]
              </instruction>
            </section>

            <section id="product-analysis" title="Product/Service Analysis" status="required">
              <instruction>
                - **Core Offerings:** [Main products]
                - **Key Features:** [Standout capabilities]
                - **User Experience:** [UX assessment]
                - **Technology Stack:** [Tech used]

<llm critical="true">
  <i>MANDATORY: Use the 'bmm-technical-evaluator' subagent to analyze and compare competitor technology stacks.</i>
  <i>The subagent will identify technical differentiators and architectural advantages.</i>
</llm>

                - **Pricing:** [Pricing model and tiers]
              </instruction>
            </section>

            <section id="strengths-weaknesses" title="Strengths &amp; Weaknesses" status="required">
              <instruction>
                **Strengths:**
                - [Strength 1]
                - [Strength 2]
                - [Strength 3]

                **Weaknesses:**
                - [Weakness 1]
                - [Weakness 2]
                - [Weakness 3]
              </instruction>
            </section>

            <section id="market-position" title="Market Position &amp; Performance" status="required">
              <instruction>
                - **Market Share:** [Estimated share]
                - **Customer Base:** [Size and notable customers]
                - **Growth Trajectory:** [Growth trend]
                - **Recent Developments:** [Key news/updates]

<llm critical="true">
  <i>MANDATORY: Use the 'bmm-data-analyst' subagent to analyze competitor performance metrics and market share data.</i>
</llm>

              </instruction>
            </section>
          </sections>
        </section>
      </sections>
    </section>

    <section id="comparative-analysis" title="Comparative Analysis" status="required">
      <instruction>
        Provide detailed comparisons across competitors.

        <llm><i>Create comprehensive comparison matrices and analysis</i></llm>
      </instruction>

      <sections>
        <section id="feature-comparison" title="Feature Comparison Matrix" status="required">
          <instruction>
            Create a detailed comparison table of key features across competitors:

            | Feature Category                | {{your_company}} | {{competitor_1}} | {{competitor_2}} | {{competitor_3}} |
            | ------------------------------- | ---------------- | ---------------- | ---------------- | ---------------- |
            | **Core Functionality**          |
            | Feature A                       | [Status]         | [Status]         | [Status]         | [Status]         |
            | Feature B                       | [Status]         | [Status]         | [Status]         | [Status]         |
            | **User Experience**             |
            | Mobile App                      | [Rating]         | [Rating]         | [Rating]         | [Rating]         |
            | Onboarding Time                 | [Time]           | [Time]           | [Time]           | [Time]           |
            | **Integration &amp; Ecosystem** |
            | API Availability                | [Yes/No]         | [Yes/No]         | [Yes/No]         | [Yes/No]         |
            | Third-party Integrations        | [Number]         | [Number]         | [Number]         | [Number]         |
            | **Pricing &amp; Plans**         |
            | Starting Price                  | [Price]          | [Price]          | [Price]          | [Price]          |
            | Free Tier                       | [Yes/No]         | [Yes/No]         | [Yes/No]         | [Yes/No]         |
          </instruction>
        </section>

        <section id="swot-comparison" title="SWOT Comparison" status="required">
          <instruction>
            Create SWOT analysis for your solution vs. top competitors.
          </instruction>

          <sections>
            <section id="your-solution" title="Your Solution" status="required">
              <instruction>
                - **Strengths:** [Your strengths]
                - **Weaknesses:** [Your weaknesses]
                - **Opportunities:** [Market opportunities]
                - **Threats:** [Competitive threats]
              </instruction>
            </section>

            <section id="vs-competitor" title="vs. {{main_competitor}}" status="required">
              <instruction>
                - **Competitive Advantages:** [Your advantages]
                - **Competitive Disadvantages:** [Their advantages]
                - **Differentiation Opportunities:** [How to differentiate]
              </instruction>
            </section>
          </sections>
        </section>

        <section id="positioning-map" title="Positioning Map" status="optional">
          <instruction>
            Describe competitor positions on key dimensions

            Create a positioning description using 2 key dimensions relevant to the market, such as:
            - Price vs. Features
            - Ease of Use vs. Power
            - Specialization vs. Breadth
            - Self-Serve vs. High-Touch
          </instruction>
        </section>
      </sections>
    </section>

    <section id="strategic-analysis" title="Strategic Analysis" status="required">
      <instruction>
        Analyze strategic implications of competitive landscape.

        <llm><i>Provide strategic insights based on competitive analysis</i></llm>
      </instruction>

      <sections>
        <section id="competitive-advantages" title="Competitive Advantages Assessment" status="required">
          <instruction>
            Assess advantages and vulnerabilities.
          </instruction>

          <sections>
            <section id="sustainable-advantages" title="Sustainable Advantages" status="required">
              <instruction>
                Identify moats and defensible positions:
                - Network effects
                - Switching costs
                - Brand strength
                - Technology barriers
                - Regulatory advantages
              </instruction>
            </section>

            <section id="vulnerable-points" title="Vulnerable Points" status="required">
              <instruction>
                Where competitors could be challenged:
                - Weak customer segments
                - Missing features
                - Poor user experience
                - High prices
                - Limited geographic presence
              </instruction>
            </section>
          </sections>
        </section>

        <section id="blue-ocean" title="Blue Ocean Opportunities" status="optional">
          <instruction>
            Identify uncontested market spaces

            List opportunities to create new market space:
            - Underserved segments
            - Unaddressed use cases
            - New business models
            - Geographic expansion
            - Different value propositions
          </instruction>
        </section>
      </sections>
    </section>

    <section id="strategic-recommendations" title="Strategic Recommendations" status="required">
      <instruction>
        Provide actionable strategic recommendations based on analysis.
      </instruction>

      <sections>
        <section id="differentiation-strategy" title="Differentiation Strategy" status="required">
          <instruction>
            How to position against competitors:
            - Unique value propositions to emphasize
            - Features to prioritize
            - Segments to target
            - Messaging and positioning
          </instruction>
        </section>

        <section id="competitive-response" title="Competitive Response Planning" status="required">
          <instruction>
            Plan offensive and defensive strategies.
          </instruction>

          <sections>
            <section id="offensive-strategies" title="Offensive Strategies" status="required">
              <instruction>
                How to gain market share:
                - Target competitor weaknesses
                - Win competitive deals
                - Capture their customers
              </instruction>
            </section>

            <section id="defensive-strategies" title="Defensive Strategies" status="required">
              <instruction>
                How to protect your position:
                - Strengthen vulnerable areas
                - Build switching costs
                - Deepen customer relationships
              </instruction>
            </section>
          </sections>
        </section>

        <section id="partnership-ecosystem" title="Partnership &amp; Ecosystem Strategy" status="optional">
          <instruction>
            Potential collaboration opportunities:
            - Complementary players
            - Channel partners
            - Technology integrations
            - Strategic alliances
          </instruction>
        </section>
      </sections>
    </section>

    <section id="monitoring-plan" title="Monitoring &amp; Intelligence Plan" status="required">
      <instruction>
        Define ongoing competitive intelligence approach.
      </instruction>

      <sections>
        <section id="key-competitors" title="Key Competitors to Track" status="required">
          <instruction>
            Priority list with rationale for ongoing monitoring.
          </instruction>
        </section>

        <section id="monitoring-metrics" title="Monitoring Metrics" status="required">
          <instruction>
            What to track:
            - Product updates
            - Pricing changes
            - Customer wins/losses
            - Funding/M&amp;A activity
            - Market messaging
          </instruction>
        </section>

        <section id="intelligence-sources" title="Intelligence Sources" status="required">
          <instruction>
            Where to gather ongoing intelligence:
            - Company websites/blogs
            - Customer reviews
            - Industry reports
            - Social media
            - Patent filings
          </instruction>
        </section>

        <section id="update-cadence" title="Update Cadence" status="required">
          <instruction>
            Recommended review schedule:
            - **Weekly:** [Items to check weekly]
            - **Monthly:** [Monthly review items]
            - **Quarterly:** [Quarterly deep analysis]
          </instruction>
        </section>
      </sections>
    </section>
  </sections>

  <variables>
    <variable name="project_product_name" default="Product Name" />
    <variable name="your_company" default="Your Company" />
    <variable name="competitor_1" default="Competitor 1" />
    <variable name="competitor_2" default="Competitor 2" />
    <variable name="competitor_3" default="Competitor 3" />
    <variable name="main_competitor" default="Main Competitor" />
  </variables>
</template>
```
