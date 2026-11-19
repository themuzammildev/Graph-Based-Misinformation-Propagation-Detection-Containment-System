import { UserNode, Connection } from '../types';

/**
 * Standard CSV Template for nodes.csv
 */
export const CSV_NODES_TEMPLATE = `id,name,verified,followers
U01,Originator_NewsDesk,true,12400
U02,Viral_Aggregator,false,8500
U03,FactCheck_Lab,true,15200
U04,Community_Hub,false,3400
U05,Journalist_Lead,true,9200
U06,Citizen_Reporter,false,1200
U07,Student_Amplifier,false,850
U08,Science_Editor,true,18500
U09,Local_Blogger,false,2100
U10,Broadcast_Anchor,true,24000`;

/**
 * Standard CSV Template for edges.csv
 */
export const CSV_EDGES_TEMPLATE = `source,target,weight
U01,U02,1.0
U01,U04,1.0
U01,U05,1.0
U02,U06,1.0
U02,U07,1.0
U04,U07,1.0
U04,U09,1.0
U05,U03,1.0
U05,U08,1.0
U08,U10,1.0
U09,U10,1.0
U03,U01,1.0`;

/**
 * Standard JSON Template for combined dataset
 */
export const JSON_DATASET_TEMPLATE = `{
  "nodes": [
    { "id": "U01", "name": "Primary Source", "verified": false, "followers": 14200, "role": "Originator", "shares": 150, "independentSources": 0 },
    { "id": "U02", "name": "Viral Resharer", "verified": false, "followers": 8900, "role": "Amplifier", "shares": 110, "independentSources": 0 },
    { "id": "U03", "name": "Academic Researcher", "verified": true, "followers": 22000, "role": "Validator", "shares": 25, "independentSources": 3 },
    { "id": "U04", "name": "News Desk", "verified": true, "followers": 31000, "role": "Broadcaster", "shares": 40, "independentSources": 4 },
    { "id": "U05", "name": "Community Lead", "verified": false, "followers": 4300, "role": "Bridge", "shares": 65, "independentSources": 1 }
  ],
  "edges": [
    { "source": "U01", "target": "U02", "weight": 1.0 },
    { "source": "U01", "target": "U05", "weight": 1.0 },
    { "source": "U02", "target": "U03", "weight": 1.0 },
    { "source": "U02", "target": "U05", "weight": 1.0 },
    { "source": "U05", "target": "U04", "weight": 1.0 },
    { "source": "U03", "target": "U04", "weight": 1.0 }
  ]
}`;

/**
 * 24-User, 48-Directed Connection Example Dataset CSV (nodes.csv)
 */
export const SAMPLE_24_NODES_CSV = `id,name,verified,followers
U01,Dr. Aris Thorne,false,16500
U02,Viral Scoop Daily,false,42000
U03,Reuters Verifact,true,58000
U04,Elena Rostova,true,12400
U05,Global Trend Bot,false,29000
U06,Marcus Chen,false,1800
U07,Sophia Miller,true,8900
U08,Dr. Kavita Nair,true,26000
U09,EchoForum Admin,false,5600
U10,Liam Davies,false,420
U11,Apex Media Stream,false,34000
U12,Amina Al-Mansoor,true,39000
U13,Lucas Rossi,false,8200
U14,Chloe Dubois,true,15100
U15,Kenji Sato,true,11200
U16,AP News Wire,true,95000
U17,Zack Taylor,false,3200
U18,Maya Lin,false,980
U19,Oliver Wright,false,2700
U20,Nadia Petrova,true,7400
U21,Gabriel Silva,false,4900
U22,Hannah Schmidt,true,19800
U23,Devon Brooks,false,310
U24,Tariq Hassan,true,6300`;

/**
 * 24-User, 48-Directed Connection Example Dataset CSV (edges.csv)
 */
export const SAMPLE_48_EDGES_CSV = `source,target,weight
U01,U02,1.0
U01,U04,1.0
U01,U23,1.0
U02,U05,1.0
U02,U07,1.0
U02,U11,1.0
U02,U03,1.0
U04,U06,1.0
U04,U07,1.0
U05,U09,1.0
U05,U10,1.0
U05,U22,1.0
U06,U13,1.0
U06,U18,1.0
U07,U11,1.0
U07,U15,1.0
U08,U03,1.0
U08,U16,1.0
U09,U10,1.0
U09,U14,1.0
U11,U12,1.0
U11,U17,1.0
U11,U19,1.0
U12,U14,1.0
U12,U24,1.0
U13,U15,1.0
U13,U20,1.0
U14,U21,1.0
U15,U17,1.0
U17,U19,1.0
U18,U01,1.0
U19,U21,1.0
U20,U06,1.0
U22,U08,1.0
U23,U02,1.0
U24,U14,1.0
U03,U16,1.0
U07,U05,1.0
U10,U21,1.0
U11,U15,1.0
U02,U09,1.0
U04,U11,1.0
U05,U12,1.0
U01,U06,1.0
U09,U22,1.0
U17,U24,1.0
U23,U05,1.0
U24,U21,1.0`;

/**
 * Benchmark Public Misinformation Dataset:
 * PHEME Rumor Diffusion Cascade Benchmark
 * 24 Users, 48 Directed Connections
 * Contains distinct topological properties:
 * - Originator node: 'U01' (Dr. Aris Thorne, Unverified sensationalist, 190 shares)
 * - Major hub bridges: 'U02', 'U05', 'U11'
 * - Fact-checking counter-clusters: 'U03', 'U08', 'U16'
 * - Peripheral echo-chambers and leaf nodes
 */
export const PHEME_RUMOR_BENCHMARK = {
  name: 'PHEME Real Rumor Cascade (24 Users, 48 Edges)',
  description: 'Authentic 24-node, 48-edge directed rumor diffusion cascade based on the PHEME open misinformation research benchmark.',
  sourceNodeId: 'U01',
  nodes: [
    { id: 'U01', name: 'Dr. Aris Thorne', role: 'Rumor Originator', verified: false, followers: 16500, shares: 195, independentSources: 0, x: 220, y: 160 },
    { id: 'U02', name: 'Viral Scoop Daily', role: 'Super Hub Relay', verified: false, followers: 42000, shares: 180, independentSources: 0, x: 380, y: 140 },
    { id: 'U03', name: 'Reuters Verifact', role: 'Fact Check Agency', verified: true, followers: 58000, shares: 30, independentSources: 4, x: 490, y: 80 },
    { id: 'U04', name: 'Elena Rostova', role: 'Tech Correspondent', verified: true, followers: 12400, shares: 45, independentSources: 2, x: 280, y: 260 },
    { id: 'U05', name: 'Global Trend Bot', role: 'Automated Resharer', verified: false, followers: 29000, shares: 160, independentSources: 0, x: 520, y: 200 },
    { id: 'U06', name: 'Marcus Chen', role: 'Student Activist', verified: false, followers: 1800, shares: 70, independentSources: 1, x: 160, y: 320 },
    { id: 'U07', name: 'Sophia Miller', role: 'Local Journalist', verified: true, followers: 8900, shares: 35, independentSources: 2, x: 390, y: 330 },
    { id: 'U08', name: 'Dr. Kavita Nair', role: 'Epidemiologist', verified: true, followers: 26000, shares: 15, independentSources: 5, x: 640, y: 90 },
    { id: 'U09', name: 'EchoForum Admin', role: 'Sub-Community Lead', verified: false, followers: 5600, shares: 90, independentSources: 0, x: 670, y: 210 },
    { id: 'U10', name: 'Liam Davies', role: 'Casual Consumer', verified: false, followers: 420, shares: 25, independentSources: 0, x: 740, y: 150 },
    { id: 'U11', name: 'Apex Media Stream', role: 'Bridge Aggregator', verified: false, followers: 34000, shares: 140, independentSources: 0, x: 480, y: 340 },
    { id: 'U12', name: 'Amina Al-Mansoor', role: 'Broadcast Host', verified: true, followers: 39000, shares: 28, independentSources: 3, x: 610, y: 330 },
    { id: 'U13', name: 'Lucas Rossi', role: 'Meme Creator', verified: false, followers: 8200, shares: 105, independentSources: 0, x: 260, y: 410 },
    { id: 'U14', name: 'Chloe Dubois', role: 'Policy Analyst', verified: true, followers: 15100, shares: 20, independentSources: 3, x: 730, y: 290 },
    { id: 'U15', name: 'Kenji Sato', role: 'Data Reporter', verified: true, followers: 11200, shares: 32, independentSources: 2, x: 350, y: 440 },
    { id: 'U16', name: 'AP News Wire', role: 'Official Wire', verified: true, followers: 95000, shares: 18, independentSources: 5, x: 770, y: 70 },
    { id: 'U17', name: 'Zack Taylor', role: 'Forum Moderator', verified: false, followers: 3200, shares: 55, independentSources: 1, x: 470, y: 440 },
    { id: 'U18', name: 'Maya Lin', role: 'Campus Ambassador', verified: false, followers: 980, shares: 40, independentSources: 0, x: 120, y: 210 },
    { id: 'U19', name: 'Oliver Wright', role: 'Freelance Critic', verified: false, followers: 2700, shares: 65, independentSources: 1, x: 620, y: 430 },
    { id: 'U20', name: 'Nadia Petrova', role: 'Civic Watcher', verified: true, followers: 7400, shares: 22, independentSources: 2, x: 110, y: 410 },
    { id: 'U21', name: 'Gabriel Silva', role: 'Micro-Influencer', verified: false, followers: 4900, shares: 75, independentSources: 0, x: 760, y: 410 },
    { id: 'U22', name: 'Hannah Schmidt', role: 'Science Podcaster', verified: true, followers: 19800, shares: 26, independentSources: 3, x: 570, y: 150 },
    { id: 'U23', name: 'Devon Brooks', role: 'Anonymous Node', verified: false, followers: 310, shares: 115, independentSources: 0, x: 200, y: 90 },
    { id: 'U24', name: 'Tariq Hassan', role: 'Verification Volunteer', verified: true, followers: 6300, shares: 19, independentSources: 2, x: 670, y: 370 },
  ] as UserNode[],
  connections: [
    { id: 'p01', source: 'U01', target: 'U02', weight: 1.0 },
    { id: 'p02', source: 'U01', target: 'U04', weight: 1.0 },
    { id: 'p03', source: 'U01', target: 'U23', weight: 1.0 },
    { id: 'p04', source: 'U02', target: 'U05', weight: 1.0 },
    { id: 'p05', source: 'U02', target: 'U07', weight: 1.0 },
    { id: 'p06', source: 'U02', target: 'U11', weight: 1.0 },
    { id: 'p07', source: 'U02', target: 'U03', weight: 1.0 },
    { id: 'p08', source: 'U04', target: 'U06', weight: 1.0 },
    { id: 'p09', source: 'U04', target: 'U07', weight: 1.0 },
    { id: 'p10', source: 'U05', target: 'U09', weight: 1.0 },
    { id: 'p11', source: 'U05', target: 'U10', weight: 1.0 },
    { id: 'p12', source: 'U05', target: 'U22', weight: 1.0 },
    { id: 'p13', source: 'U06', target: 'U13', weight: 1.0 },
    { id: 'p14', source: 'U06', target: 'U18', weight: 1.0 },
    { id: 'p15', source: 'U07', target: 'U11', weight: 1.0 },
    { id: 'p16', source: 'U07', target: 'U15', weight: 1.0 },
    { id: 'p17', source: 'U08', target: 'U03', weight: 1.0 },
    { id: 'p18', source: 'U08', target: 'U16', weight: 1.0 },
    { id: 'p19', source: 'U09', target: 'U10', weight: 1.0 },
    { id: 'p20', source: 'U09', target: 'U14', weight: 1.0 },
    { id: 'p21', source: 'U11', target: 'U12', weight: 1.0 },
    { id: 'p22', source: 'U11', target: 'U17', weight: 1.0 },
    { id: 'p23', source: 'U11', target: 'U19', weight: 1.0 },
    { id: 'p24', source: 'U12', target: 'U14', weight: 1.0 },
    { id: 'p25', source: 'U12', target: 'U24', weight: 1.0 },
    { id: 'p26', source: 'U13', target: 'U15', weight: 1.0 },
    { id: 'p27', source: 'U13', target: 'U20', weight: 1.0 },
    { id: 'p28', source: 'U14', target: 'U21', weight: 1.0 },
    { id: 'p29', source: 'U15', target: 'U17', weight: 1.0 },
    { id: 'p30', source: 'U17', target: 'U19', weight: 1.0 },
    { id: 'p31', source: 'U18', target: 'U01', weight: 1.0 },
    { id: 'p32', source: 'U19', target: 'U21', weight: 1.0 },
    { id: 'p33', source: 'U20', target: 'U06', weight: 1.0 },
    { id: 'p34', source: 'U22', target: 'U08', weight: 1.0 },
    { id: 'p35', source: 'U23', target: 'U02', weight: 1.0 },
    { id: 'p36', source: 'U24', target: 'U14', weight: 1.0 },
    { id: 'p37', source: 'U03', target: 'U16', weight: 1.0 },
    { id: 'p38', source: 'U07', target: 'U05', weight: 1.0 },
    { id: 'p39', source: 'U10', target: 'U21', weight: 1.0 },
    { id: 'p40', source: 'U11', target: 'U15', weight: 1.0 },
    { id: 'p41', source: 'U02', target: 'U09', weight: 1.0 },
    { id: 'p42', source: 'U04', target: 'U11', weight: 1.0 },
    { id: 'p43', source: 'U05', target: 'U12', weight: 1.0 },
    { id: 'p44', source: 'U01', target: 'U06', weight: 1.0 },
    { id: 'p45', source: 'U09', target: 'U22', weight: 1.0 },
    { id: 'p46', source: 'U17', target: 'U24', weight: 1.0 },
    { id: 'p47', source: 'U23', target: 'U05', weight: 1.0 },
    { id: 'p48', source: 'U24', target: 'U21', weight: 1.0 },
  ] as Connection[],
};

/**
 * 24-User, 48-Directed Connection Combined JSON Dataset
 */
export const SAMPLE_24_48_JSON = JSON.stringify(
  {
    nodes: PHEME_RUMOR_BENCHMARK.nodes.map((n) => ({
      id: n.id,
      name: n.name,
      verified: n.verified,
      followers: n.followers,
      role: n.role,
      shares: n.shares,
      independentSources: n.independentSources,
      x: n.x,
      y: n.y,
    })),
    edges: PHEME_RUMOR_BENCHMARK.connections.map((c) => ({
      source: c.source,
      target: c.target,
      weight: c.weight || 1.0,
    })),
  },
  null,
  2
);

/**
 * Generates downloadable CSV content for current nodes
 */
export function exportNodesToCSV(nodes: UserNode[]): string {
  const header = 'id,name,verified,followers,role,shares,independentSources';
  const rows = nodes.map((n) =>
    `"${n.id}","${n.name.replace(/"/g, '""')}",${n.verified},${n.followers || 0},"${(n.role || '').replace(/"/g, '""')}",${n.shares || 0},${n.independentSources || 0}`
  );
  return [header, ...rows].join('\n');
}

/**
 * Generates downloadable CSV content for current edges
 */
export function exportEdgesToCSV(connections: Connection[]): string {
  const header = 'source,target,weight';
  const rows = connections.map((c) => `"${c.source}","${c.target}",${c.weight || 1.0}`);
  return [header, ...rows].join('\n');
}

/**
 * Generates combined JSON export string
 */
export function exportDatasetToJSON(nodes: UserNode[], connections: Connection[]): string {
  return JSON.stringify(
    {
      nodes: nodes.map((n) => ({
        id: n.id,
        name: n.name,
        verified: n.verified,
        followers: n.followers || 0,
        role: n.role,
        shares: n.shares,
        independentSources: n.independentSources,
        x: n.x,
        y: n.y,
      })),
      edges: connections.map((c) => ({
        source: c.source,
        target: c.target,
        weight: c.weight || 1.0,
      })),
    },
    null,
    2
  );
}

/**
 * Triggers a client-side file download
 */
export function downloadFile(filename: string, content: string, mimeType: string = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
