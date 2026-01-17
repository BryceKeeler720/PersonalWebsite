import React, { useState, useRef, useEffect } from 'react';
import Spline from '@splinetool/react-spline';
import Hotspot from './Hotspot';
import ContentPanel from './ContentPanel';
import type { HotspotData, ContentData } from './types';
import './InteractiveRoom.css';

const InteractiveRoom: React.FC = () => {
  const [selectedHotspot, setSelectedHotspot] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Hotspot positions (these will be positioned over the Spline scene)
  const hotspots: HotspotData[] = [
    {
      id: 'computer',
      label: 'Projects',
      position: { x: 35, y: 45 }, // Percentage-based positioning
      icon: '💻'
    },
    {
      id: 'server-rack',
      label: 'Infrastructure',
      position: { x: 70, y: 50 },
      icon: '🖥️'
    },
    {
      id: 'desk',
      label: 'About',
      position: { x: 50, y: 65 },
      icon: '📋'
    },
    {
      id: 'bookshelf',
      label: 'Achievements',
      position: { x: 15, y: 40 },
      icon: '📚'
    }
  ];

  // Content for each hotspot
  const contentData: Record<string, ContentData> = {
    computer: {
      title: 'Projects & Development',
      subtitle: 'What I build and create',
      items: [
        {
          title: 'Workday AI Recruiting App',
          description: 'Published on Workday Marketplace - AI-powered recruiting solution',
          tags: ['Workday Extend', 'XSLT', 'AI', 'Enterprise'],
          link: '#'
        },
        {
          title: 'Reddit Content Automation',
          description: 'n8n workflows + FastAPI for automated social media content',
          tags: ['n8n', 'FastAPI', 'Python', 'Automation'],
          link: '#'
        },
        {
          title: 'Personal Portfolio',
          description: 'Interactive 3D portfolio with Astro and Spline',
          tags: ['Astro', 'React', 'Spline', 'TypeScript'],
          link: '/'
        }
      ]
    },
    'server-rack': {
      title: 'Home Lab Infrastructure',
      subtitle: 'Self-hosted services & virtualization',
      items: [
        {
          title: 'Proxmox Virtualization',
          description: 'Enterprise-grade hypervisor running multiple VMs and containers',
          tags: ['Proxmox', 'LXC', 'KVM'],
        },
        {
          title: 'Network Services',
          description: 'Pi-hole ad blocking, Tailscale VPN, DNS management',
          tags: ['Pi-hole', 'Tailscale', 'DNS'],
        },
        {
          title: 'Automation Hub',
          description: 'n8n workflows, FastAPI microservices, scheduled tasks',
          tags: ['n8n', 'Docker', 'FastAPI'],
        }
      ]
    },
    desk: {
      title: 'About Bryce Keeler',
      subtitle: 'Digital Consulting Analyst',
      items: [
        {
          title: 'Huron Consulting Group',
          description: 'Workday systems integration and data transformation specialist',
          tags: ['Workday', 'Consulting', 'ERP'],
        },
        {
          title: 'Core Skills',
          description: 'Workday, React, TypeScript, Python, SQL, XSLT, n8n, Proxmox',
          tags: ['Full Stack', 'DevOps', 'Enterprise'],
        },
        {
          title: 'Approach',
          description: 'Bridging technical complexity and business needs through automation',
          tags: ['Problem Solving', 'Innovation'],
        }
      ]
    },
    bookshelf: {
      title: 'Achievements & Interests',
      subtitle: 'Continuous learning and growth',
      items: [
        {
          title: 'Workday Marketplace',
          description: 'Published AI recruiting application available to enterprise clients',
          tags: ['Published', 'Enterprise'],
        },
        {
          title: 'Tech Enthusiast',
          description: 'Passionate about automation, infrastructure, and modern web technologies',
          tags: ['Automation', 'Self-Hosting'],
        },
        {
          title: 'Always Building',
          description: 'Constantly experimenting with new tools, frameworks, and technologies',
          tags: ['Innovation', 'Learning'],
        }
      ]
    }
  };

  // Mouse tracking for parallax effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      setMousePosition({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleHotspotClick = (hotspotId: string) => {
    setSelectedHotspot(selectedHotspot === hotspotId ? null : hotspotId);
  };

  const handleCloseContent = () => {
    setSelectedHotspot(null);
  };

  // Calculate parallax transform based on mouse position
  const parallaxTransform = {
    transform: `
      perspective(1000px)
      rotateX(${(mousePosition.y - 0.5) * -5}deg)
      rotateY(${(mousePosition.x - 0.5) * 5}deg)
    `
  };

  return (
    <div className="interactive-room" ref={containerRef}>
      {/* Loading overlay */}
      {!isLoaded && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Loading your workspace...</p>
        </div>
      )}

      {/* Spline 3D Scene */}
      <div className="spline-container" style={parallaxTransform}>
        <Spline
          scene="https://prod.spline.design/Q4QXKyGg8LbBaE8z/scene.splinecode"
          onLoad={() => setIsLoaded(true)}
        />
      </div>

      {/* Hotspot indicators */}
      {isLoaded && (
        <div className="hotspots-layer">
          {hotspots.map((hotspot) => (
            <Hotspot
              key={hotspot.id}
              data={hotspot}
              isActive={selectedHotspot === hotspot.id}
              onClick={() => handleHotspotClick(hotspot.id)}
            />
          ))}
        </div>
      )}

      {/* Content panels */}
      {selectedHotspot && (
        <ContentPanel
          content={contentData[selectedHotspot]}
          onClose={handleCloseContent}
          hotspotId={selectedHotspot}
        />
      )}

      {/* Instructions overlay */}
      {isLoaded && !selectedHotspot && (
        <div className="instructions">
          <p className="instruction-text">
            <span className="plus-icon">+</span>
            Move your mouse to explore • Click hotspots to learn more
          </p>
        </div>
      )}
    </div>
  );
};

export default InteractiveRoom;
