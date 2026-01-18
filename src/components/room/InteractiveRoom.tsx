import React, { useState, useRef, useEffect } from 'react';
import Spline from '@splinetool/react-spline';
import ContentPanel from './ContentPanel';
import type { ContentData } from './types';
import './InteractiveRoom.css';
import type { Application } from '@splinetool/runtime';

const InteractiveRoom: React.FC = () => {
  const [selectedHotspot, setSelectedHotspot] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);
  const [hoveredObject, setHoveredObject] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const splineRef = useRef<Application | null>(null);

  // Map of Spline object names to hotspot IDs
  // UPDATE THESE to match your actual Spline object names
  const objectMapping: Record<string, string> = {
    'Computer': 'computer',
    'Monitor': 'computer',
    'PC': 'computer',
    'ServerRack': 'server-rack',
    'Server': 'server-rack',
    'Desk': 'desk',
    'DeskArea': 'desk',
    'Bookshelf': 'bookshelf',
    'Books': 'bookshelf',
    'Shelf': 'bookshelf'
  };

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

  const onSplineLoad = (spline: Application) => {
    splineRef.current = spline;
    setIsLoaded(true);

    // Log all available object names to help you identify them
    const allObjects = spline.getAllObjects();
    console.log('Spline loaded. Available objects:', allObjects.map((obj: any) => obj.name));

    // Set up click events using Spline's event system
    spline.addEventListener('mouseDown', (e: any) => {
      if (e.target && e.target.name) {
        const objectName = e.target.name;
        const hotspotId = objectMapping[objectName];

        if (hotspotId) {
          console.log(`Clicked on: ${objectName} -> ${hotspotId}`);
          handleHotspotClick(hotspotId);
        }
      }
    });

    // Set up hover events
    spline.addEventListener('mouseHover', (e: any) => {
      if (e.target && e.target.name) {
        const objectName = e.target.name;
        const hotspotId = objectMapping[objectName];

        if (hotspotId) {
          setHoveredObject(hotspotId);
          if (containerRef.current) {
            containerRef.current.style.cursor = 'pointer';
          }
        }
      }
    });

    // Reset hover state when mouse moves away
    spline.addEventListener('mouseUp', () => {
      setHoveredObject(null);
      if (containerRef.current) {
        containerRef.current.style.cursor = 'default';
      }
    });
  };

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
          onLoad={onSplineLoad}
        />
      </div>

      {/* Hover indicator */}
      {isLoaded && hoveredObject && !selectedHotspot && (
        <div className="hover-indicator">
          <span className="hover-text">
            Click to explore {contentData[hoveredObject]?.title || 'this area'}
          </span>
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
      {isLoaded && !selectedHotspot && !hoveredObject && (
        <div className="instructions">
          <p className="instruction-text">
            <span className="click-icon">🖱️</span>
            Move your mouse to explore • Click objects to learn more
          </p>
        </div>
      )}
    </div>
  );
};

export default InteractiveRoom;
