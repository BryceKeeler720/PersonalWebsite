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
      subtitle: 'Self-hosted services & container orchestration',
      items: [
        {
          title: 'Proxmox Virtualization',
          description: 'Managing 6 containerized services including PostgreSQL databases, FastAPI apps, and media servers',
          tags: ['Proxmox', 'Docker', 'LXC'],
        },
        {
          title: 'Network Services',
          description: 'Pi-hole DNS, Tailscale VPN, and Jellyfin media server with persistent storage',
          tags: ['Pi-hole', 'Tailscale', 'Jellyfin'],
        },
        {
          title: 'Service Orchestration',
          description: 'Docker containerization with managed networking, monitoring, and system administration on Linux',
          tags: ['Docker', 'Linux', 'Bash'],
        }
      ]
    },
    computer: {
      title: 'Projects',
      subtitle: 'What I build',
      items: [
        {
          title: 'NutriOne - Nutrition Tracking App',
          description: 'Full-stack app with FastAPI, PostgreSQL, React. Custom YOLOv8 models for food detection trained on Food-101 dataset',
          tags: ['FastAPI', 'React', 'PyTorch', 'YOLOv8'],
        },
        {
          title: 'Plant Health Monitor',
          description: 'IoT pipeline with ESP32 microcontrollers, 9 sensors, computer vision for plant analysis, and ML models for health prediction',
          tags: ['IoT', 'OpenCV', 'TimescaleDB', 'LSTM'],
        },
        {
          title: 'Workday Time Tracking App',
          description: 'Production-grade Workday Extend application published on Workday Marketplace',
          tags: ['Workday Extend', 'Enterprise'],
          link: 'https://marketplace.workday.com'
        }
      ]
    },
    books: {
      title: 'Experience & Certifications',
      subtitle: 'Professional background',
      items: [
        {
          title: 'Huron Consulting Group - Analyst',
          description: 'Building enterprise apps with Workday Extend, data pipelines processing 560GB weekly, and LLM-powered automation',
          tags: ['Workday', 'SQL', 'Power Automate'],
        },
        {
          title: 'Workday Certified',
          description: 'Certified in Workday Integrations, Workday Extend, and Workday Orchestrations',
          tags: ['Integrations', 'Extend', 'Orchestrations'],
        },
        {
          title: 'UT Dallas - B.S. CIS',
          description: 'Davidson Management Honors Program, EY Expedition Scholarship recipient',
          tags: ['Dec 2024', 'Honors'],
        }
      ]
    },
    'sticky-notes': {
      title: 'Interests',
      subtitle: 'Outside of code',
      items: [
        {
          title: 'Olympic Weightlifting',
          description: 'Training and competing in snatch and clean & jerk',
          tags: ['Fitness', 'Strength'],
        },
        {
          title: 'Rock Climbing',
          description: 'Bouldering and sport climbing',
          tags: ['Outdoors', 'Adventure'],
        },
        {
          title: 'Always Building',
          description: 'Chess, volleyball, basketball, and making music',
          tags: ['Chess', 'Sports', 'Music'],
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
