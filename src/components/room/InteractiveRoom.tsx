import React, { useState, useRef, useEffect } from 'react';
import Spline from '@splinetool/react-spline';
import ContentPanel from './ContentPanel';
import Navigation from './Navigation';
import GalaxyBackground from './GalaxyBackground';
import type { ContentData } from './types';
import './InteractiveRoom.css';
import type { Application } from '@splinetool/runtime';

const InteractiveRoom: React.FC = () => {
  const [selectedHotspot, setSelectedHotspot] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [hoveredObject, setHoveredObject] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [hotspotPositions, setHotspotPositions] = useState<Record<string, { x: number; y: number; visible: boolean }>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const splineRef = useRef<Application | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);

  const MOUSE_ICON_URL = '/icons/mouse.png';
  const PINCH_ICON_URL = '/icons/pinch.png';

  // mapping spline objects to hotspot ids
  const objectMapping: Record<string, string> = {
    'Server Rack': 'server-rack',
    'Computer': 'computer',
    'Books': 'books',
    'Sticky Notes': 'sticky-notes'
  };

  const contentData: Record<string, ContentData> = {
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
    books: {
      title: 'Certifications & Learning',
      subtitle: 'Continuous learning and growth',
      items: [
        {
          title: 'Workday Certifications',
          description: 'Certified in Workday integrations and system architecture',
          tags: ['Workday', 'Certified'],
        },
        {
          title: 'Tech Learning',
          description: 'Constantly expanding knowledge in cloud, DevOps, and modern frameworks',
          tags: ['Cloud', 'DevOps', 'Web Dev'],
        },
        {
          title: 'Problem Solving',
          description: 'Applying technical knowledge to solve real business challenges',
          tags: ['Enterprise', 'Solutions'],
        }
      ]
    },
    'sticky-notes': {
      title: 'Interests & Passions',
      subtitle: 'What drives me',
      items: [
        {
          title: 'Automation Enthusiast',
          description: 'Building workflows and tools to automate repetitive tasks',
          tags: ['n8n', 'Python', 'Efficiency'],
        },
        {
          title: 'Self-Hosting',
          description: 'Running my own infrastructure and learning through hands-on experience',
          tags: ['Homelab', 'Linux', 'Proxmox'],
        },
        {
          title: 'Always Building',
          description: 'Constantly experimenting with new tools, frameworks, and technologies',
          tags: ['Innovation', 'Learning'],
        }
      ]
    }
  };


  const onSplineLoad = (spline: Application) => {
    splineRef.current = spline;

    const checkMobile = () => {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        (navigator.maxTouchPoints ? navigator.maxTouchPoints > 0 : false);
    };
    setIsMobile(checkMobile());

    const allObjects = spline.getAllObjects();
    console.log('Spline loaded. Available objects:', allObjects.map((obj: any) => obj.name));

    const splineInternal = spline as any;
    if (splineInternal._camera) {
      console.log('Camera position:', splineInternal._camera.position);
      console.log('Camera rotation:', splineInternal._camera.rotation);
    }

    // wait for welcome screen animation
    setTimeout(() => {
      setIsLoaded(true);
      setTimeout(() => {
        setShowWelcome(false);
      }, 1200);
    }, 1000);

    // click handling
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

    // hover stuff
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

  // this tracks the 3d objects and converts them to 2d screen positions for the + buttons
  useEffect(() => {
    if (!isLoaded || !splineRef.current || !containerRef.current) return;

    let lastPositions: Record<string, { x: number; y: number; visible: boolean }> = {};
    let smoothedPositions: Record<string, { x: number; y: number }> = {};

    const updateHotspotPositions = () => {
      const spline = splineRef.current;
      const container = containerRef.current;
      if (!spline || !container) {
        animationFrameRef.current = requestAnimationFrame(updateHotspotPositions);
        return;
      }

      try {
        const newPositions: Record<string, { x: number; y: number; visible: boolean }> = {};
        const hotspotIds = Array.from(new Set(Object.values(objectMapping)));

        hotspotIds.forEach((hotspotId) => {
          const objectName = Object.keys(objectMapping).find(key => objectMapping[key] === hotspotId);
          if (!objectName) return;

          try {
            const obj = spline.findObjectByName(objectName);
            if (obj && obj.position) {
              const splineInternal = spline as any;
              const camera = splineInternal._camera;
              if (!camera) return;

              const objInternal = obj as any;

              if (objInternal.updateMatrixWorld) {
                objInternal.updateMatrixWorld();
              }

              let worldX = obj.position.x;
              let worldY = obj.position.y;
              let worldZ = obj.position.z;

              if (objInternal.getWorldPosition) {
                const Vector3 = objInternal.position.constructor;
                const worldPos = objInternal.getWorldPosition(new Vector3());
                worldX = worldPos.x;
                worldY = worldPos.y;
                worldZ = worldPos.z;
              }

              const Vector3 = objInternal.position.constructor;
              const vector = new Vector3(worldX, worldY, worldZ);

              if (vector.project) {
                vector.project(camera);

                // convert to screen coords
                const containerRect = container.getBoundingClientRect();
                const targetX = (vector.x * 0.5 + 0.5) * containerRect.width;
                const targetY = (-(vector.y * 0.5) + 0.5) * containerRect.height;

                if (!smoothedPositions[hotspotId]) {
                  smoothedPositions[hotspotId] = { x: targetX, y: targetY };
                }

                // smooth out the movement with lerp
                const lerpFactor = 0.15;
                smoothedPositions[hotspotId].x += (targetX - smoothedPositions[hotspotId].x) * lerpFactor;
                smoothedPositions[hotspotId].y += (targetY - smoothedPositions[hotspotId].y) * lerpFactor;

                const visible = vector.z < 1 &&
                              targetX >= 0 && targetX <= containerRect.width &&
                              targetY >= 0 && targetY <= containerRect.height;

                newPositions[hotspotId] = {
                  x: Math.round(smoothedPositions[hotspotId].x),
                  y: Math.round(smoothedPositions[hotspotId].y),
                  visible
                };
              }
            }
          } catch (e) {
            // skip if object not found
          }
        });

        // only update if something actually changed (prevents unnecessary re-renders)
        const hasChanged = Object.keys(newPositions).some(key => {
          const last = lastPositions[key];
          const current = newPositions[key];
          if (!last || !current) return true;
          return Math.abs(last.x - current.x) > 1 ||
                 Math.abs(last.y - current.y) > 1 ||
                 last.visible !== current.visible;
        });

        if (hasChanged) {
          lastPositions = newPositions;
          setHotspotPositions(newPositions);
        }
      } catch (e) {
        // sometimes this errors out, just skip the frame
      }

      animationFrameRef.current = requestAnimationFrame(updateHotspotPositions);
    };

    animationFrameRef.current = requestAnimationFrame(updateHotspotPositions);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isLoaded]);

  return (
    <div className="interactive-room" ref={containerRef}>
      <GalaxyBackground
        density={0.7}
        glowIntensity={0.2}
        hueShift={360}
        twinkleIntensity={0.2}
        rotationSpeed={0}
        repulsionStrength={0}
        starSpeed={0.1}
        speed={0.1}
        mouseRepulsion={false}
        mouseInteraction={false}
      />

      <Navigation />

      {showWelcome && (
        <div className={`welcome-screen ${!isLoaded ? 'active' : 'fade-out'}`}>
          <div className="welcome-content">
            <h1 className="welcome-title">
              <span className="welcome-word">Welcome</span>
              <span className="welcome-word">To</span>
              <span className="welcome-word">My</span>
              <span className="welcome-word">Room!</span>
            </h1>
            <div className="welcome-spinner">
              <div className="spinner-ring"></div>
              <div className="spinner-ring"></div>
              <div className="spinner-ring"></div>
            </div>
          </div>
        </div>
      )}

      <div className="spline-container">
        <Spline
          scene="https://prod.spline.design/Q4QXKyGg8LbBaE8z/scene.splinecode"
          onLoad={onSplineLoad}
        />
      </div>

      {isLoaded && !selectedHotspot && Object.entries(hotspotPositions).map(([hotspotId, pos]) => (
        pos.visible && (
          <button
            key={hotspotId}
            className="hotspot-button"
            style={{
              left: `${pos.x}px`,
              top: `${pos.y}px`,
            }}
            onClick={() => handleHotspotClick(hotspotId)}
            aria-label={`View ${contentData[hotspotId]?.title || hotspotId}`}
          >
            +
          </button>
        )
      ))}

      {isLoaded && hoveredObject && !selectedHotspot && (
        <div className="hover-indicator">
          <span className="hover-text">
            Click to explore {contentData[hoveredObject]?.title || 'this area'}
          </span>
        </div>
      )}

      {selectedHotspot && (
        <ContentPanel
          content={contentData[selectedHotspot]}
          onClose={handleCloseContent}
          hotspotId={selectedHotspot}
        />
      )}

      {isLoaded && !selectedHotspot && !hoveredObject && (
        <div className="instructions">
          <p className="instruction-text">
            {isMobile ? (
              <>
                <span className="click-icon">
                  <img src={PINCH_ICON_URL} alt="Pinch gesture" />
                </span>
                Pinch to zoom and rotate • Tap objects to learn more
              </>
            ) : (
              <>
                <span className="click-icon">
                  <img src={MOUSE_ICON_URL} alt="Mouse" />
                </span>
                Move your mouse to explore • Click objects to learn more
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
};

export default InteractiveRoom;
