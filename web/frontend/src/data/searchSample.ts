export interface PaperResult {
  id: string;
  title: string;
  authors: string[];
  year: number;
  source: string;
  type: "Journal" | "Conference" | "Preprint";
  fields: string[];
  keywords: string[];
  abstract: string;
  citations: number;
  doi: string;
  url: string;
}

export const SOURCES = [
  "OpenAlex",
  "Semantic Scholar",
  "Crossref",
  "arXiv",
  "IEEE Xplore",
];

export const FIELDS = [
  "Large Language Models",
  "Computer Vision",
  "Federated Learning",
  "Graph Neural Networks",
  "Quantum Machine Learning",
  "Edge & TinyML",
];

export const TYPES: PaperResult["type"][] = ["Journal", "Conference", "Preprint"];

export const RELATED_KEYWORDS = [
  "mixture of experts",
  "retrieval-augmented generation",
  "parameter-efficient fine-tuning",
  "differential privacy",
  "knowledge distillation",
  "contrastive learning",
];

export const PAPERS: PaperResult[] = [
  {
    id: "s1",
    title: "Sparse Mixture-of-Experts Scaling Laws for Multilingual Reasoning",
    authors: ["N. Patel", "L. Zhou", "A. Rossi", "M. Haddad"],
    year: 2025,
    source: "arXiv",
    type: "Preprint",
    fields: ["Large Language Models"],
    keywords: ["mixture of experts", "scaling laws", "multilingual", "reasoning"],
    abstract:
      "We derive empirical scaling laws for sparse mixture-of-experts (MoE) language models under multilingual reasoning workloads, showing that expert routing entropy predicts cross-lingual transfer more reliably than raw parameter count.",
    citations: 84,
    doi: "10.48550/arXiv.2503.01234",
    url: "https://arxiv.org/",
  },
  {
    id: "s2",
    title: "Communication-Efficient Federated Learning on Heterogeneous Edge Devices",
    authors: ["M. Okafor", "S. Kim"],
    year: 2025,
    source: "IEEE Xplore",
    type: "Journal",
    fields: ["Federated Learning", "Edge & TinyML"],
    keywords: ["federated learning", "communication efficiency", "edge devices"],
    abstract:
      "A gradient-sketching protocol reduces uplink traffic by 63% while preserving convergence guarantees across devices with non-IID data distributions and intermittent connectivity.",
    citations: 41,
    doi: "10.1109/TMC.2025.0456",
    url: "https://ieeexplore.ieee.org/",
  },
  {
    id: "s3",
    title: "Graph Neural Networks for Materials Discovery: A Benchmark Study",
    authors: ["R. Duarte", "H. Nakamura", "P. Silva", "T. Lang", "K. Mensah", "J. Weiss"],
    year: 2024,
    source: "OpenAlex",
    type: "Conference",
    fields: ["Graph Neural Networks"],
    keywords: ["graph neural networks", "materials discovery", "benchmark"],
    abstract:
      "We release a benchmark of 1.2M crystalline structures and evaluate twelve GNN architectures on formation-energy prediction, highlighting the gap between message-passing and equivariant models.",
    citations: 156,
    doi: "10.1145/3612345.3612399",
    url: "https://openalex.org/",
  },
  {
    id: "s4",
    title: "Variational Quantum Circuits Meet Contrastive Representation Learning",
    authors: ["E. Halvorsen", "P. Iyer"],
    year: 2025,
    source: "arXiv",
    type: "Preprint",
    fields: ["Quantum Machine Learning"],
    keywords: ["variational quantum circuits", "contrastive learning", "representation"],
    abstract:
      "We show that shallow variational quantum circuits can serve as effective contrastive encoders on near-term hardware, with barren-plateau mitigation via layerwise pretraining.",
    citations: 12,
    doi: "10.48550/arXiv.2502.09876",
    url: "https://arxiv.org/",
  },
  {
    id: "s5",
    title: "On-Device Vision Transformers Under One Million Parameters",
    authors: ["C. Alvarez", "T. Berg", "R. Nolan"],
    year: 2024,
    source: "Semantic Scholar",
    type: "Conference",
    fields: ["Computer Vision", "Edge & TinyML"],
    keywords: ["vision transformer", "on-device", "tinyml", "quantization"],
    abstract:
      "A hybrid token-merging and 4-bit quantization pipeline yields ViT variants under 1M parameters that run in real time on microcontrollers while retaining 91% of full-model accuracy.",
    citations: 67,
    doi: "10.1007/978-3-031-56789-0_14",
    url: "https://www.semanticscholar.org/",
  },
  {
    id: "s6",
    title: "Retrieval-Augmented Generation for Low-Resource Clinical Notes",
    authors: ["J. Fernández", "K. Adebayo"],
    year: 2025,
    source: "Crossref",
    type: "Journal",
    fields: ["Large Language Models"],
    keywords: ["retrieval-augmented generation", "clinical nlp", "low-resource"],
    abstract:
      "By grounding generation in a curated clinical knowledge base, our RAG pipeline reduces hallucinated medication references by 48% on Spanish and Vietnamese discharge summaries.",
    citations: 29,
    doi: "10.1016/j.jbi.2025.104512",
    url: "https://www.crossref.org/",
  },
  {
    id: "s7",
    title: "Privacy-Preserving Aggregation with Secure Multiparty Computation",
    authors: ["D. Petrov", "Y. Chen", "L. Marconi"],
    year: 2024,
    source: "IEEE Xplore",
    type: "Conference",
    fields: ["Federated Learning"],
    keywords: ["secure aggregation", "mpc", "differential privacy"],
    abstract:
      "We combine secret sharing with adaptive clipping to achieve secure federated aggregation whose overhead scales sublinearly with the number of participating clients.",
    citations: 93,
    doi: "10.1109/SP.2024.00078",
    url: "https://ieeexplore.ieee.org/",
  },
  {
    id: "s8",
    title: "Equivariant Graph Networks for Protein–Ligand Binding Affinity",
    authors: ["S. Ramanathan", "O. Björk"],
    year: 2023,
    source: "OpenAlex",
    type: "Journal",
    fields: ["Graph Neural Networks"],
    keywords: ["equivariant networks", "drug discovery", "binding affinity"],
    abstract:
      "An SE(3)-equivariant architecture predicts binding affinity from 3D complexes, outperforming docking baselines on the PDBbind core set by a wide margin.",
    citations: 211,
    doi: "10.1021/acs.jcim.3c00891",
    url: "https://openalex.org/",
  },
  {
    id: "s9",
    title: "Instruction Tuning with Synthetic Preference Data at Scale",
    authors: ["A. Novak", "R. Mehta", "F. Costa"],
    year: 2025,
    source: "arXiv",
    type: "Preprint",
    fields: ["Large Language Models"],
    keywords: ["instruction tuning", "preference optimization", "synthetic data"],
    abstract:
      "We study whether synthetic preference pairs can replace human feedback for alignment, finding a reliable regime below which synthetic-only tuning matches RLHF on held-out judges.",
    citations: 47,
    doi: "10.48550/arXiv.2501.04567",
    url: "https://arxiv.org/",
  },
  {
    id: "s10",
    title: "Self-Supervised Depth Estimation for Autonomous Micro-Drones",
    authors: ["G. Ferreira", "H. Sato"],
    year: 2023,
    source: "Crossref",
    type: "Conference",
    fields: ["Computer Vision", "Edge & TinyML"],
    keywords: ["self-supervised", "depth estimation", "drones"],
    abstract:
      "A lightweight self-supervised network estimates metric depth from a single camera on 30-gram drones, enabling obstacle avoidance without active sensors.",
    citations: 58,
    doi: "10.1145/3587654.3587701",
    url: "https://www.crossref.org/",
  },
  {
    id: "s11",
    title: "Quantum Kernel Methods for Small-Sample Genomics",
    authors: ["V. Ivanova", "M. Reyes"],
    year: 2024,
    source: "Semantic Scholar",
    type: "Journal",
    fields: ["Quantum Machine Learning"],
    keywords: ["quantum kernels", "genomics", "small-sample"],
    abstract:
      "Quantum kernel estimators show a measurable advantage on high-dimensional, small-sample genomics classification where classical kernels overfit.",
    citations: 19,
    doi: "10.1093/bioinformatics/btae123",
    url: "https://www.semanticscholar.org/",
  },
  {
    id: "s12",
    title: "Continual Federated Learning Under Concept Drift",
    authors: ["B. Anderson", "N. Farouk", "T. Vo"],
    year: 2025,
    source: "OpenAlex",
    type: "Journal",
    fields: ["Federated Learning"],
    keywords: ["continual learning", "concept drift", "federated learning"],
    abstract:
      "We propose a drift-aware aggregation rule that lets a federation adapt to evolving client distributions without catastrophic forgetting of earlier tasks.",
    citations: 8,
    doi: "10.1162/tmlr.2025.0033",
    url: "https://openalex.org/",
  },
];
